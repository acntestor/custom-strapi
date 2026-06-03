import type { Schema, Struct } from '@strapi/strapi';

export interface CustomFooterColumn extends Struct.ComponentSchema {
  collectionName: 'components_custom_footer_columns';
  info: {
    displayName: 'Footer Column';
  };
  attributes: {
    footer_column_items: Schema.Attribute.Component<
      'custom.footer-column-items',
      true
    >;
    label: Schema.Attribute.String;
    sort: Schema.Attribute.Integer;
    url: Schema.Attribute.String;
  };
}

export interface CustomFooterColumnItems extends Struct.ComponentSchema {
  collectionName: 'components_custom_footer_column_items';
  info: {
    displayName: 'Footer Column Items';
  };
  attributes: {
    label: Schema.Attribute.String;
    sort: Schema.Attribute.Integer;
    url: Schema.Attribute.String;
  };
}

export interface CustomLegalLinks extends Struct.ComponentSchema {
  collectionName: 'components_custom_legal_links';
  info: {
    displayName: 'Legal Links';
  };
  attributes: {
    label: Schema.Attribute.String;
    sort: Schema.Attribute.Integer;
    url: Schema.Attribute.String;
  };
}

export interface CustomMainNavigation extends Struct.ComponentSchema {
  collectionName: 'components_custom_main_navigations';
  info: {
    displayName: 'Main Navigation';
  };
  attributes: {
    is_external: Schema.Attribute.Boolean;
    label: Schema.Attribute.String;
    sort: Schema.Attribute.Integer;
    url: Schema.Attribute.String;
  };
}

export interface CustomSocialLinks extends Struct.ComponentSchema {
  collectionName: 'components_custom_social_links';
  info: {
    displayName: 'Social Links';
  };
  attributes: {
    icon: Schema.Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    platform: Schema.Attribute.String;
    sort: Schema.Attribute.Integer;
    url: Schema.Attribute.String;
  };
}

export interface CustomTopLinks extends Struct.ComponentSchema {
  collectionName: 'components_custom_top_links';
  info: {
    displayName: 'Top Links';
  };
  attributes: {
    is_external: Schema.Attribute.Boolean;
    label: Schema.Attribute.String;
    sort: Schema.Attribute.Integer;
    url: Schema.Attribute.String;
  };
}

export interface SharedMedia extends Struct.ComponentSchema {
  collectionName: 'components_shared_media';
  info: {
    displayName: 'Media';
    icon: 'file-video';
  };
  attributes: {
    file: Schema.Attribute.Media<'images' | 'files' | 'videos'>;
  };
}

export interface SharedQuote extends Struct.ComponentSchema {
  collectionName: 'components_shared_quotes';
  info: {
    displayName: 'Quote';
    icon: 'indent';
  };
  attributes: {
    body: Schema.Attribute.Text;
    title: Schema.Attribute.String;
  };
}

export interface SharedRichText extends Struct.ComponentSchema {
  collectionName: 'components_shared_rich_texts';
  info: {
    description: '';
    displayName: 'Rich text';
    icon: 'align-justify';
  };
  attributes: {
    body: Schema.Attribute.RichText;
  };
}

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: {
    description: '';
    displayName: 'Seo';
    icon: 'allergies';
    name: 'Seo';
  };
  attributes: {
    metaDescription: Schema.Attribute.Text & Schema.Attribute.Required;
    metaTitle: Schema.Attribute.String & Schema.Attribute.Required;
    shareImage: Schema.Attribute.Media<'images'>;
  };
}

export interface SharedSlider extends Struct.ComponentSchema {
  collectionName: 'components_shared_sliders';
  info: {
    description: '';
    displayName: 'Slider';
    icon: 'address-book';
  };
  attributes: {
    files: Schema.Attribute.Media<'images', true>;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'custom.footer-column': CustomFooterColumn;
      'custom.footer-column-items': CustomFooterColumnItems;
      'custom.legal-links': CustomLegalLinks;
      'custom.main-navigation': CustomMainNavigation;
      'custom.social-links': CustomSocialLinks;
      'custom.top-links': CustomTopLinks;
      'shared.media': SharedMedia;
      'shared.quote': SharedQuote;
      'shared.rich-text': SharedRichText;
      'shared.seo': SharedSeo;
      'shared.slider': SharedSlider;
    }
  }
}
