import { getTranslation } from './utils/getTranslation';
import { PLUGIN_ID } from './pluginId';
import { Initializer } from './components/Initializer';

export default {
  register(app) {
    app.createSettingSection(
      {
        id: PLUGIN_ID,
        intlLabel: {
          id: getTranslation('settings.section'),
          defaultMessage: 'Administration Panel',
        },
      },
      [
        {
          id: 'audit-logs',
          intlLabel: {
            id: getTranslation('plugin.name'),
            defaultMessage: 'Audit Logs',
          },
          to: 'ac-audit-logs',
          Component: async () => {
            const { App } = await import('./pages/App');

            return App;
          },
          permissions: [],
        },
      ]
    );

    app.registerPlugin({
      id: PLUGIN_ID,
      initializer: Initializer,
      isReady: false,
      name: PLUGIN_ID,
    });
  },

  async registerTrads({ locales }) {
    return Promise.all(
      locales.map(async (locale) => {
        try {
          const { default: data } = await import(
            `./translations/${locale}.json`
          );

          return {
            data,
            locale,
          };
        } catch {
          return {
            data: {},
            locale,
          };
        }
      })
    );
  },
};