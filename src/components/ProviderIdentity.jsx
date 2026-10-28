import React, { useEffect, useState } from 'react';
import { getProviderBrand } from '../data/providerBrands';
import './ProviderIdentity.css';

export default function ProviderIdentity({ provider, compact = false }) {
  const name = typeof provider === 'string' && provider.trim() ? provider : 'Quiz';
  const brand = getProviderBrand(name);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [brand?.id]);
  return (
    <span
      className={'provider-identity' + (compact ? ' provider-identity-compact' : '')}
      data-provider={brand?.id}
    >
      <span className="provider-mark" aria-hidden="true">
        {brand && !failed ? (
          <img
            src={import.meta.env.BASE_URL + brand.icon}
            alt=""
            width={32}
            height={32}
            onError={() => setFailed(true)}
          />
        ) : (
          <span>{brand?.initials || name.slice(0, 2).toUpperCase()}</span>
        )}
      </span>
      <span className="provider-name">{name}</span>
    </span>
  );
}
