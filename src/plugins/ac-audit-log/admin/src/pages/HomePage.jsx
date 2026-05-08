import React, { useEffect, useMemo, useState } from 'react';
import { Main } from '@strapi/design-system';
import { useTheme } from 'styled-components';
import { useSearchParams } from 'react-router-dom';

import auditLogApi from '../api/audit-log';
import { ChangedFields } from '../components/ChangedFields';
import { createStyles } from './HomePage.styles';

const FILTER_FIELDS = [
  {
    name: 'action',
    label: 'Action',
    placeholder: 'entry.create',
  },
  {
    name: 'actorEmail',
    label: 'User email',
    placeholder: 'admin@example.com',
  },
  {
    name: 'ip',
    label: 'IP',
    placeholder: '127.0.0.1',
  },
];

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 50;
const DEFAULT_SORT = 'eventDate:DESC';

const formatDate = (value) => {
  if (!value) {
    return '-';
  }

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

const getUserLabel = (log) => {
  return (
    log.actorDisplayName ||
    log.actorEmail ||
    (log.actorId ? `User #${log.actorId}` : 'Unknown')
  );
};

const getContentTypeLabel = (log) => {
  return log.contentTypeUid || '-';
};

const JsonBlock = ({ value, styles }) => {
  return <pre style={styles.pre}>{JSON.stringify(value || null, null, 2)}</pre>;
};

const getInitialNumberParam = (searchParams, key, fallback) => {
  const value = Number(searchParams.get(key));

  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return value;
};

const getInitialStringParam = (searchParams, key, fallback = '') => {
  return searchParams.get(key) || fallback;
};

const getPageNumbers = (page, pageCount) => {
  const safePage = Number(page || DEFAULT_PAGE);
  const safePageCount = Number(pageCount || 1);

  if (safePageCount <= 5) {
    return Array.from({ length: safePageCount }, (_, index) => index + 1);
  }

  const pages = new Set([1, safePageCount, safePage]);

  if (safePage > 1) {
    pages.add(safePage - 1);
  }

  if (safePage < safePageCount) {
    pages.add(safePage + 1);
  }

  return [...pages].sort((a, b) => a - b);
};

const HomePage = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [searchParams, setSearchParams] = useSearchParams();

  const [logs, setLogs] = useState([]);

  const [pagination, setPagination] = useState({
    page: getInitialNumberParam(searchParams, 'page', DEFAULT_PAGE),
    pageSize: getInitialNumberParam(
      searchParams,
      'pageSize',
      DEFAULT_PAGE_SIZE
    ),
    pageCount: 0,
    total: 0,
  });

  const [sort] = useState(
    getInitialStringParam(searchParams, 'sort', DEFAULT_SORT)
  );

  const [filters, setFilters] = useState({
    action: getInitialStringParam(searchParams, 'action'),
    actorEmail: getInitialStringParam(searchParams, 'actorEmail'),
    ip: getInitialStringParam(searchParams, 'ip'),
  });

  const [filterOpen, setFilterOpen] = useState(false);

  const [draftFilter, setDraftFilter] = useState({
    field: 'action',
    value: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selectedLogId, setSelectedLogId] = useState(null);

  const selectedLog = useMemo(() => {
    return logs.find((item) => item.id === selectedLogId) || null;
  }, [logs, selectedLogId]);

  const queryParams = useMemo(
    () => ({
      page: pagination.page,
      pageSize: pagination.pageSize,
      sort,
      action: filters.action,
      actorEmail: filters.actorEmail,
      ip: filters.ip,
    }),
    [
      pagination.page,
      pagination.pageSize,
      sort,
      filters.action,
      filters.actorEmail,
      filters.ip,
    ]
  );

  const syncUrl = () => {
    const nextParams = new URLSearchParams();

    nextParams.set('pageSize', String(pagination.pageSize));
    nextParams.set('page', String(pagination.page));
    nextParams.set('sort', sort);

    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        nextParams.set(key, value);
      }
    });

    setSearchParams(nextParams, {
      replace: true,
    });
  };

  const loadLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await auditLogApi.findMany(queryParams);

      setLogs(response.data || []);

      setPagination((current) => ({
        ...current,
        ...(response.meta?.pagination || {}),
      }));
    } catch (err) {
      setError(
        err?.response?.data?.error?.message ||
        err?.message ||
        'Failed to load audit logs'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncUrl();
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryParams]);

  const activeFilterEntries = Object.entries(filters).filter(([, value]) => {
    return Boolean(value);
  });

  const getFilterLabel = (fieldName) => {
    return (
      FILTER_FIELDS.find((field) => field.name === fieldName)?.label ||
      fieldName
    );
  };

  const addFilter = () => {
    if (!draftFilter.field || !draftFilter.value) {
      return;
    }

    setPagination((current) => ({
      ...current,
      page: 1,
    }));

    setFilters((current) => ({
      ...current,
      [draftFilter.field]: draftFilter.value,
    }));

    setDraftFilter({
      field: 'action',
      value: '',
    });

    setFilterOpen(false);
  };

  const removeFilter = (fieldName) => {
    setPagination((current) => ({
      ...current,
      page: 1,
    }));

    setFilters((current) => ({
      ...current,
      [fieldName]: '',
    }));
  };

  const changePageSize = (event) => {
    setPagination((current) => ({
      ...current,
      page: 1,
      pageSize: Number(event.target.value),
    }));
  };

  const goToPage = (page) => {
    const pageCount = pagination.pageCount || 1;

    if (page < 1 || page > pageCount) {
      return;
    }

    setPagination((current) => ({
      ...current,
      page,
    }));
  };

  const pageNumbers = getPageNumbers(pagination.page, pagination.pageCount);

  return (
    <Main>
      <div style={styles.page}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Audit Logs</h1>
            <p style={styles.subtitle}>
              Logs of all the activities that happened in your environment
            </p>
          </div>
        </div>

        <div style={styles.toolbar}>
          <div style={styles.filterArea}>
            <button
              type="button"
              style={styles.filterButton}
              onClick={() => setFilterOpen((current) => !current)}
            >
              <span style={styles.filterButtonIcon}>≡</span>
              <span>Filters</span>
            </button>

            {filterOpen ? (
              <div style={styles.filterPopover}>
                <p style={styles.filterPopoverTitle}>Add filter</p>

                <select
                  style={styles.filterControl}
                  value={draftFilter.field}
                  onChange={(event) =>
                    setDraftFilter((current) => ({
                      ...current,
                      field: event.target.value,
                    }))
                  }
                >
                  {FILTER_FIELDS.map((field) => (
                    <option key={field.name} value={field.name}>
                      {field.label}
                    </option>
                  ))}
                </select>

                <select
                  style={{
                    ...styles.filterControl,
                    ...styles.filterControlDisabled,
                  }}
                  value="is"
                  disabled
                >
                  <option value="is">is</option>
                </select>

                <input
                  style={styles.filterControl}
                  value={draftFilter.value}
                  placeholder={
                    FILTER_FIELDS.find(
                      (field) => field.name === draftFilter.field
                    )?.placeholder || 'Select or enter a value'
                  }
                  onChange={(event) =>
                    setDraftFilter((current) => ({
                      ...current,
                      value: event.target.value,
                    }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      addFilter();
                    }
                  }}
                />

                <button
                  type="button"
                  style={styles.addFilterButton}
                  onClick={addFilter}
                >
                  + Add filter
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {activeFilterEntries.length > 0 ? (
          <div style={styles.activeFilters}>
            {activeFilterEntries.map(([fieldName, value]) => (
              <span key={fieldName} style={styles.activeFilterChip}>
                {getFilterLabel(fieldName)} is {value}
                <button
                  type="button"
                  style={styles.removeFilterButton}
                  onClick={() => removeFilter(fieldName)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : null}

        {error ? <div style={styles.error}>{error}</div> : null}

        <div style={styles.card}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Action</th>
                <th style={styles.th}>Content Type</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>User</th>
                <th style={styles.th}>IP</th>
                <th style={styles.th}>Details</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td style={styles.td} colSpan={6}>
                    Loading audit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td style={styles.td} colSpan={6}>
                    No audit logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td style={styles.td}>
                      <code style={styles.code}>{log.action}</code>
                    </td>

                    <td style={styles.td}>{getContentTypeLabel(log)}</td>

                    <td style={styles.td}>
                      {formatDate(log.eventDate || log.createdAt)}
                    </td>

                    <td style={styles.td}>{getUserLabel(log)}</td>

                    <td style={styles.td}>{log.ip || '-'}</td>

                    <td style={styles.td}>
                      <button
                        type="button"
                        style={styles.linkButton}
                        onClick={() => setSelectedLogId(log.id)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={styles.footer}>
          <div style={styles.pageSizeArea}>
            <select
              style={styles.pageSizeSelect}
              value={pagination.pageSize}
              onChange={changePageSize}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>

            <span>Entries per page</span>
          </div>

          <div style={styles.pagination}>
            <button
              type="button"
              style={{
                ...styles.pageButton,
                ...(pagination.page <= 1 ? styles.disabledButton : {}),
              }}
              disabled={pagination.page <= 1}
              onClick={() => goToPage(pagination.page - 1)}
            >
              ‹
            </button>

            {pageNumbers.map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                style={{
                  ...styles.pageButton,
                  ...(pagination.page === pageNumber
                    ? styles.activePageButton
                    : {}),
                }}
                onClick={() => goToPage(pageNumber)}
              >
                {pageNumber}
              </button>
            ))}

            <button
              type="button"
              style={{
                ...styles.pageButton,
                ...(pagination.page >= (pagination.pageCount || 1)
                  ? styles.disabledButton
                  : {}),
              }}
              disabled={pagination.page >= (pagination.pageCount || 1)}
              onClick={() => goToPage(pagination.page + 1)}
            >
              ›
            </button>
          </div>
        </div>

        {selectedLog ? (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>
                  {formatDate(selectedLog.eventDate || selectedLog.createdAt)}
                </h2>

                <button
                  type="button"
                  style={styles.modalCloseButton}
                  onClick={() => setSelectedLogId(null)}
                >
                  ×
                </button>
              </div>

              <div style={styles.modalBody}>
                <div style={styles.summaryGrid}>
                  <div>
                    <div style={styles.summaryLabel}>Action</div>
                    <div style={styles.summaryValue}>{selectedLog.action}</div>
                  </div>

                  <div>
                    <div style={styles.summaryLabel}>Date</div>
                    <div style={styles.summaryValue}>
                      {formatDate(selectedLog.eventDate || selectedLog.createdAt)}
                    </div>
                  </div>

                  <div>
                    <div style={styles.summaryLabel}>User</div>
                    <div style={styles.summaryValue}>
                      {getUserLabel(selectedLog)}
                    </div>
                  </div>

                  <div>
                    <div style={styles.summaryLabel}>User ID</div>
                    <div style={styles.summaryValue}>
                      {selectedLog.actorId || '-'}
                    </div>
                  </div>

                  <div>
                    <div style={styles.summaryLabel}>IP</div>
                    <div style={styles.summaryValue}>
                      {selectedLog.ip || '-'}
                    </div>
                  </div>

                  <div>
                    <div style={styles.summaryLabel}>Content Type</div>
                    <div style={styles.summaryValue}>
                      {selectedLog.contentTypeUid || '-'}
                    </div>
                  </div>
                </div>

                <div style={styles.diffSection}>
                  <ChangedFields log={selectedLog} styles={styles} />
                </div>

                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>Request / Payload</h3>

                  <JsonBlock
                    styles={styles}
                    value={{
                      payload: selectedLog.payload,
                      requestBody: selectedLog.requestBody,
                      responseBody: selectedLog.responseBody,
                    }}
                  />
                </div>

                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>Snapshots / Diff</h3>

                  <JsonBlock
                    styles={styles}
                    value={{
                      before: selectedLog.before,
                      after: selectedLog.after,
                      diff: selectedLog.diff,
                      metadata: selectedLog.metadata,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Main>
  );
};

export { HomePage };