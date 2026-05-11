import React, { useEffect, useMemo, useState } from 'react';
import {
  Combobox,
  ComboboxOption,
  Main,
  SingleSelect,
  SingleSelectOption,
} from '@strapi/design-system';
import { useTheme } from 'styled-components';
import { useSearchParams } from 'react-router-dom';

import auditLogApi from '../api/audit-log';
import { ChangedFields } from '../components/ChangedFields';
import { createStyles } from './HomePage.styles';

const DEFAULT_ACTION_OPTIONS = [
  { label: 'Create entry', value: 'entry.create' },
  { label: 'Update entry', value: 'entry.update' },
  { label: 'Delete entry', value: 'entry.delete' },
  { label: 'Publish entry', value: 'entry.publish' },
  { label: 'Unpublish entry', value: 'entry.unpublish' },
];

const DEFAULT_FILTER_OPTIONS = {
  actions: DEFAULT_ACTION_OPTIONS,
  contentTypes: [],
  actorEmails: [],
  ips: [],
};

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
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

const stringifyJson = (value) => {
  return JSON.stringify(value || null, null, 2);
};

const buildFilterFields = (filterOptions = DEFAULT_FILTER_OPTIONS) => {
  return [
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      operators: [{ label: 'is', value: 'is' }],
      options:
        filterOptions.actions?.length > 0
          ? filterOptions.actions
          : DEFAULT_ACTION_OPTIONS,
    },
    {
      name: 'contentTypeUid',
      label: 'Content Type',
      type: 'select',
      operators: [{ label: 'is', value: 'is' }],
      options: filterOptions.contentTypes || [],
    },
    {
      name: 'actorEmail',
      label: 'User email',
      type: 'combobox',
      operators: [
        { label: 'contains', value: 'contains' },
        { label: 'is', value: 'is' },
      ],
      placeholder: 'admin@example.com',
      suggestions: filterOptions.actorEmails || [],
    },
    {
      name: 'ip',
      label: 'IP',
      type: 'combobox',
      operators: [
        { label: 'contains', value: 'contains' },
        { label: 'is', value: 'is' },
      ],
      placeholder: '127.0.0.1',
      suggestions: filterOptions.ips || [],
    },
  ];
};

const AuditButton = ({ styles, variant = 'secondary', children, ...props }) => {
  const styleMap = {
    primary: styles.auditButtonPrimary,
    secondary: styles.auditButtonSecondary,
    ghost: styles.auditButtonGhost,
    danger: styles.auditButtonDanger,
  };

  return (
    <button
      type="button"
      style={styleMap[variant] || styles.auditButtonSecondary}
      {...props}
    >
      {children}
    </button>
  );
};

const AuditSingleSelect = ({ value, onChange, placeholder, options = [], styles }) => {
  return (
    <div style={styles.designSystemControlWrapper}>
      <SingleSelect
        value={value || undefined}
        placeholder={placeholder}
        onChange={(nextValue) => onChange(nextValue || '')}
      >
        {options.map((option) => (
          <SingleSelectOption key={option.value} value={option.value}>
            {option.label}
          </SingleSelectOption>
        ))}
      </SingleSelect>
    </div>
  );
};

const AuditCombobox = ({ value, onChange, placeholder, options = [], styles }) => {
  return (
    <div style={styles.designSystemControlWrapper}>
      <Combobox
        value={value || ''}
        placeholder={placeholder}
        onChange={(nextValue) => onChange(nextValue || '')}
        onClear={() => onChange('')}
      >
        {options.map((option) => (
          <ComboboxOption key={option.value} value={option.value}>
            {option.label}
          </ComboboxOption>
        ))}
      </Combobox>
    </div>
  );
};

const JsonPanel = ({ title, value, styles }) => {
  const [copied, setCopied] = useState(false);
  const jsonText = useMemo(() => stringifyJson(value), [value]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(jsonText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div style={styles.jsonPanel}>
      <div style={styles.jsonPanelHeader}>
        <h4 style={styles.jsonPanelTitle}>{title}</h4>
        <AuditButton styles={styles} variant="ghost" onClick={copyToClipboard}>
          {copied ? 'Copied' : '⧉ Copy'}
        </AuditButton>
      </div>

      <pre className="ac-audit-log-scrollbar" style={styles.jsonCodeBlock}>
        {jsonText}
      </pre>
    </div>
  );
};

const HomePage = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [searchParams, setSearchParams] = useSearchParams();
  const [logs, setLogs] = useState([]);
  const [filterOptions, setFilterOptions] = useState(DEFAULT_FILTER_OPTIONS);

  const filterFields = useMemo(
    () => buildFilterFields(filterOptions),
    [filterOptions]
  );

  const getFieldConfig = (fieldName) => {
    return filterFields.find((field) => field.name === fieldName) || filterFields[0];
  };

  const [pagination, setPagination] = useState({
    page: getInitialNumberParam(searchParams, 'page', DEFAULT_PAGE),
    pageSize: getInitialNumberParam(searchParams, 'pageSize', DEFAULT_PAGE_SIZE),
    pageCount: 0,
    total: 0,
  });

  const [sort] = useState(getInitialStringParam(searchParams, 'sort', DEFAULT_SORT));

  const [filters, setFilters] = useState({
    action: getInitialStringParam(searchParams, 'action'),
    contentTypeUid: getInitialStringParam(searchParams, 'contentTypeUid'),
    actorEmail: getInitialStringParam(searchParams, 'actorEmail'),
    actorEmailOperator: getInitialStringParam(
      searchParams,
      'actorEmailOperator',
      'contains'
    ),
    ip: getInitialStringParam(searchParams, 'ip'),
    ipOperator: getInitialStringParam(searchParams, 'ipOperator', 'contains'),
  });

  const [filterOpen, setFilterOpen] = useState(false);
  const [draftFilter, setDraftFilter] = useState({
    field: 'action',
    operator: 'is',
    value: '',
  });

  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterError, setFilterError] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  const queryParams = useMemo(
    () => ({
      page: pagination.page,
      pageSize: pagination.pageSize,
      sort,
      action: filters.action,
      contentTypeUid: filters.contentTypeUid,
      actorEmail: filters.actorEmail,
      actorEmailOperator: filters.actorEmailOperator,
      ip: filters.ip,
      ipOperator: filters.ipOperator,
    }),
    [
      pagination.page,
      pagination.pageSize,
      sort,
      filters.action,
      filters.contentTypeUid,
      filters.actorEmail,
      filters.actorEmailOperator,
      filters.ip,
      filters.ipOperator,
    ]
  );

  const selectedFieldConfig = getFieldConfig(draftFilter.field);

  const syncUrl = () => {
    const nextParams = new URLSearchParams();
    nextParams.set('pageSize', String(pagination.pageSize));
    nextParams.set('page', String(pagination.page));
    nextParams.set('sort', sort);

    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        if (key.endsWith('Operator')) {
          const baseFieldName = key.replace('Operator', '');

          if (!filters[baseFieldName]) {
            return;
          }
        }

        nextParams.set(key, value);
      }
    });

    setSearchParams(nextParams, { replace: true });
  };

  const loadFilterOptions = async () => {
    try {
      const response = await auditLogApi.getFilterOptions();

      setFilterOptions({
        ...DEFAULT_FILTER_OPTIONS,
        ...(response.data || {}),
      });
    } catch {
      setFilterOptions(DEFAULT_FILTER_OPTIONS);
    }
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

  const openLogDetails = async (id) => {
    setDetailLoading(true);
    setError(null);

    try {
      const response = await auditLogApi.findOne(id);
      setSelectedLog(response.data || null);
    } catch (err) {
      setError(
        err?.response?.data?.error?.message ||
        err?.message ||
        'Failed to load audit log details'
      );
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    loadFilterOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    syncUrl();
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryParams]);

  const activeFilterEntries = Object.entries(filters).filter(([key, value]) => {
    if (!value || key.endsWith('Operator')) {
      return false;
    }

    return true;
  });

  const getFilterLabel = (fieldName) => {
    return getFieldConfig(fieldName)?.label || fieldName;
  };

  const getFilterOperatorLabel = (fieldName) => {
    const operator = filters[`${fieldName}Operator`] || 'is';
    const field = getFieldConfig(fieldName);

    return field.operators?.find((item) => item.value === operator)?.label || operator;
  };

  const getFilterValueLabel = (fieldName, value) => {
    const field = getFieldConfig(fieldName);

    if (field.type !== 'select') {
      return value;
    }

    return field.options?.find((option) => option.value === value)?.label || value;
  };

  const validateDraftFilter = () => {
    const field = getFieldConfig(draftFilter.field);
    const rawValue = String(draftFilter.value || '').trim();

    if (!rawValue) {
      return 'Please select or enter a value.';
    }

    if (field.type === 'select') {
      const matchedOption = field.options?.some(
        (option) => option.value === rawValue
      );

      if (!matchedOption) {
        return 'Please choose a value from the list.';
      }
    }

    return '';
  };

  const addFilter = () => {
    const validationMessage = validateDraftFilter();

    if (validationMessage) {
      setFilterError(validationMessage);
      return;
    }

    const field = getFieldConfig(draftFilter.field);
    const value = String(draftFilter.value).trim();
    const operator = draftFilter.operator || field.operators[0]?.value || 'is';

    setFilterError('');
    setPagination((current) => ({ ...current, page: 1 }));

    setFilters((current) => ({
      ...current,
      [draftFilter.field]: value,
      ...(field.type === 'combobox'
        ? {
          [`${draftFilter.field}Operator`]: operator,
        }
        : {}),
    }));

    setDraftFilter({ field: 'action', operator: 'is', value: '' });
    setFilterOpen(false);
  };

  const removeFilter = (fieldName) => {
    setPagination((current) => ({ ...current, page: 1 }));
    setFilters((current) => ({
      ...current,
      [fieldName]: '',
      ...(current[`${fieldName}Operator`]
        ? {
          [`${fieldName}Operator`]: 'contains',
        }
        : {}),
    }));
  };

  const changeDraftField = (fieldName) => {
    const field = getFieldConfig(fieldName);

    setFilterError('');
    setDraftFilter({
      field: field.name,
      operator: field.operators[0]?.value || 'is',
      value: '',
    });
  };

  const changePageSize = (value) => {
    setPagination((current) => ({
      ...current,
      page: 1,
      pageSize: Number(value),
    }));
  };

  const goToPage = (page) => {
    const pageCount = pagination.pageCount || 1;

    if (page < 1 || page > pageCount) {
      return;
    }

    setPagination((current) => ({ ...current, page }));
  };

  const pageNumbers = getPageNumbers(pagination.page, pagination.pageCount);

  return (
    <Main>
      <style>
        {`
          .ac-audit-log-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: rgba(145, 145, 190, 0.45) transparent;
          }
          .ac-audit-log-scrollbar::-webkit-scrollbar {
            width: 10px;
            height: 10px;
          }
          .ac-audit-log-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .ac-audit-log-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(145, 145, 190, 0.45);
            border-radius: 999px;
            border: 3px solid transparent;
            background-clip: content-box;
          }
          .ac-audit-log-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(145, 145, 190, 0.7);
            border: 3px solid transparent;
            background-clip: content-box;
          }
        `}
      </style>

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
            <AuditButton
              styles={styles}
              variant="secondary"
              onClick={() => setFilterOpen((current) => !current)}
            >
              <span style={styles.filterButtonIcon}>≡</span>
              <span>Filters</span>
            </AuditButton>

            {filterOpen ? (
              <div style={styles.filterPopover}>
                <AuditSingleSelect
                  styles={styles}
                  value={draftFilter.field}
                  placeholder="Field"
                  options={filterFields.map((field) => ({
                    label: field.label,
                    value: field.name,
                  }))}
                  onChange={changeDraftField}
                />

                <AuditSingleSelect
                  styles={styles}
                  value={draftFilter.operator}
                  placeholder="Operator"
                  options={selectedFieldConfig.operators}
                  onChange={(value) =>
                    setDraftFilter((current) => ({
                      ...current,
                      operator: value,
                    }))
                  }
                />

                {selectedFieldConfig.type === 'select' ? (
                  <AuditSingleSelect
                    styles={styles}
                    value={draftFilter.value}
                    placeholder="Select or enter a value"
                    options={selectedFieldConfig.options}
                    onChange={(value) =>
                      setDraftFilter((current) => ({
                        ...current,
                        value,
                      }))
                    }
                  />
                ) : (
                  <AuditCombobox
                    styles={styles}
                    value={draftFilter.value}
                    placeholder={selectedFieldConfig.placeholder || 'Select or enter a value'}
                    options={selectedFieldConfig.suggestions || []}
                    onChange={(value) =>
                      setDraftFilter((current) => ({
                        ...current,
                        value,
                      }))
                    }
                  />
                )}

                {filterError ? (
                  <div style={styles.filterError}>{filterError}</div>
                ) : null}

                <AuditButton styles={styles} variant="primary" onClick={addFilter}>
                  + Add filter
                </AuditButton>
              </div>
            ) : null}
          </div>
        </div>

        {activeFilterEntries.length > 0 ? (
          <div style={styles.activeFilters}>
            {activeFilterEntries.map(([fieldName, value]) => (
              <span key={fieldName} style={styles.activeFilterChip}>
                {getFilterLabel(fieldName)} {getFilterOperatorLabel(fieldName)}{' '}
                {getFilterValueLabel(fieldName, value)}
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
                    <td style={styles.td}>{formatDate(log.eventDate || log.createdAt)}</td>
                    <td style={styles.td}>{getUserLabel(log)}</td>
                    <td style={styles.td}>{log.ip || '-'}</td>
                    <td style={styles.td}>
                      <AuditButton
                        styles={styles}
                        variant="ghost"
                        onClick={() => openLogDetails(log.id)}
                        disabled={detailLoading}
                      >
                        View
                      </AuditButton>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={styles.footer}>
          <div style={styles.pageSizeArea}>
            <div style={styles.pageSizeSelectWrapper}>
              <SingleSelect
                value={String(pagination.pageSize)}
                onChange={changePageSize}
              >
                <SingleSelectOption value="10">10</SingleSelectOption>
                <SingleSelectOption value="20">20</SingleSelectOption>
                <SingleSelectOption value="50">50</SingleSelectOption>
                <SingleSelectOption value="100">100</SingleSelectOption>
              </SingleSelect>
            </div>
            <span>Entries per page</span>
          </div>

          <div style={styles.pagination}>
            <AuditButton
              styles={styles}
              variant="secondary"
              disabled={pagination.page <= 1}
              onClick={() => goToPage(pagination.page - 1)}
            >
              ‹
            </AuditButton>

            {pageNumbers.map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                style={{
                  ...styles.pageButton,
                  ...(pagination.page === pageNumber ? styles.activePageButton : {}),
                }}
                onClick={() => goToPage(pageNumber)}
              >
                {pageNumber}
              </button>
            ))}

            <AuditButton
              styles={styles}
              variant="secondary"
              disabled={pagination.page >= (pagination.pageCount || 1)}
              onClick={() => goToPage(pagination.page + 1)}
            >
              ›
            </AuditButton>
          </div>
        </div>

        {selectedLog ? (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>
                  {formatDate(selectedLog.eventDate || selectedLog.createdAt)}
                </h2>
                <AuditButton styles={styles} variant="secondary" onClick={() => setSelectedLog(null)}>
                  ×
                </AuditButton>
              </div>

              <div className="ac-audit-log-scrollbar" style={styles.modalBody}>
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
                    <div style={styles.summaryValue}>{getUserLabel(selectedLog)}</div>
                  </div>
                  <div>
                    <div style={styles.summaryLabel}>User ID</div>
                    <div style={styles.summaryValue}>{selectedLog.actorId || '-'}</div>
                  </div>
                  <div>
                    <div style={styles.summaryLabel}>IP</div>
                    <div style={styles.summaryValue}>{selectedLog.ip || '-'}</div>
                  </div>
                  <div>
                    <div style={styles.summaryLabel}>Content Type</div>
                    <div style={styles.summaryValue}>{selectedLog.contentTypeUid || '-'}</div>
                  </div>
                </div>

                <div style={styles.diffSection}>
                  <ChangedFields log={selectedLog} styles={styles} />
                </div>

                <div style={styles.section}>
                  <JsonPanel
                    title="Request / Payload"
                    styles={styles}
                    value={{
                      payload: selectedLog.payload,
                      requestBody: selectedLog.requestBody,
                      responseBody: selectedLog.responseBody,
                    }}
                  />
                </div>

                <div style={styles.section}>
                  <JsonPanel
                    title="Snapshots / Diff"
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