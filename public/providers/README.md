# Provider icons

Small icons published by the vendors on their own sites. Original image colors are retained; light/dark UI accents are defined separately in `src/components/ProviderIdentity.css`.

| File | Source |
| --- | --- |
| `aws.png` | https://a0.awsstatic.com/libra-css/images/site/touch-icon-ipad-144-smile.png |
| `anthropic.png` | https://www.anthropic.com/images/icons/apple-touch-icon.png |
| `microsoft.ico` | https://www.microsoft.com/favicon.ico?v2 |
| `google-cloud.png` | https://www.gstatic.com/cgc/super_cloud_gradient.png |
| `istqb.png` | https://istqb.org/wp-content/uploads/2024/10/cropped-favicon-192x192.png |
| `google.png` (sign-in) | https://developers.google.com/static/identity/images/g-logo.png |

Retrieved on 2026-10-28. Each image is shown beside the provider's name, with a text fallback if it cannot load.

The sign-in dialog uses the Google identity logo above, the Microsoft icon, and the GitHub brand icon from the existing `@ant-design/icons` package. On phones, the provider jump buttons show their icons with accessible provider names; the full names remain on the group headings.
