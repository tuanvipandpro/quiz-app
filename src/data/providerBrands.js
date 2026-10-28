export const providerBrands = {
  Anthropic: { id: 'anthropic', icon: 'providers/anthropic.png', initials: 'AN' },
  AWS: { id: 'aws', icon: 'providers/aws.png', initials: 'AWS' },
  Microsoft: { id: 'microsoft', icon: 'providers/microsoft.ico', initials: 'MS' },
  'Google Cloud': { id: 'google-cloud', icon: 'providers/google-cloud.png', initials: 'GC' },
  ISTQB: { id: 'istqb', icon: 'providers/istqb.png', initials: 'IQ' },
};

export const getProviderBrand = (provider) =>
  typeof provider === 'string' && Object.hasOwn(providerBrands, provider)
    ? providerBrands[provider]
    : null;
