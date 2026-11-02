import React, { useState } from 'react';
import { Alert, Button } from 'antd';
import {
  ArrowLeftOutlined,
  CopyOutlined,
  DownloadOutlined,
  CoffeeOutlined,
} from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';
import { donation } from '../data/donation';
import { validDonation } from '../utils/donation';
import { useCopyText } from '../hooks/useCopyText';
import { useAssetDownload } from '../hooks/useAssetDownload';

export default function DonatePage({ onReturnHome }) {
  const { t } = useLanguage();
  const [imageFailed, setImageFailed] = useState(false);
  const { result, copy } = useCopyText();
  const asset = useAssetDownload();
  const ready = validDonation(donation);
  const qrUrl = ready ? import.meta.env.BASE_URL + donation.qrAsset : null;
  const status = result
    ? t(
        result.success
          ? 'Copied to clipboard.'
          : 'Could not copy. Select the text and copy it manually.'
      )
    : '';
  return (
    <div className="public-page donate-page coffee-page">
      <Button
        type="text"
        className="back-home"
        onClick={onReturnHome}
        icon={<ArrowLeftOutlined aria-hidden="true" />}
      >
        {t('Back to home')}
      </Button>
      <div className="donate-heading coffee-heading">
        <div className="coffee-illustration" aria-hidden="true">
          <span className="coffee-steam steam-one" />
          <span className="coffee-steam steam-two" />
          <span className="coffee-steam steam-three" />
          <CoffeeOutlined />
          <span className="coffee-saucer" />
        </div>
        <div className="coffee-heading-copy">
          <p className="public-eyebrow">{t('BREW A LITTLE MORE POSSIBILITY')}</p>
          <h1>{t('Buy QuizMos a coffee.')}</h1>
          <p>
            {t(
              'If QuizMos makes your study sessions a little easier, a coffee-sized contribution is a lovely way to support its continued development.'
            )}
          </p>
          <span className="coffee-kindness">{t('A small gesture. A little more motivation.')}</span>
        </div>
      </div>
      {ready ? (
        <div className="donate-grid">
          <section className="donate-qr-panel" aria-labelledby="donate-qr-heading">
            <div className="coffee-qr-label">
              <CoffeeOutlined aria-hidden="true" />
              <span>{t('One coffee, a little encouragement')}</span>
            </div>
            <h2 id="donate-qr-heading">{t('A coffee for the next chapter.')}</h2>
            <p>{t('Scan with your banking app and choose any amount in VND.')}</p>
            <div className="donate-qr-frame">
              {imageFailed ? (
                <p role="alert">
                  {t('QR image could not be loaded. Use the transfer details instead.')}
                </p>
              ) : (
                <img
                  src={qrUrl}
                  width="540"
                  height="540"
                  alt={t('VietQR for the donation account')}
                  onError={() => setImageFailed(true)}
                />
              )}
            </div>
            {!imageFailed && (
              <Button
                onClick={() => asset.download(qrUrl, 'QuizMos-VietQR.png')}
                loading={asset.busy}
                disabled={asset.busy}
                icon={<DownloadOutlined aria-hidden="true" />}
              >
                {t('Download QR')}
              </Button>
            )}
            {asset.failed && (
              <p role="alert">
                {t('Could not download the QR. Try again or use the transfer details.')}
              </p>
            )}
            <p className="donate-phone-tip">
              {t(
                'On the same phone? Save the QR, then choose it from your banking app’s photo library if supported. You can also copy the account details.'
              )}
            </p>
            <ol className="desktop-detail coffee-steps">
              <li>{t('Open your banking app')}</li>
              <li>{t('Scan the QR or copy the transfer details')}</li>
              <li>{t('Check the recipient and choose your amount')}</li>
            </ol>
          </section>
          <section className="donate-details" aria-labelledby="transfer-details-heading">
            <p className="public-eyebrow">{t('BANK TRANSFER · VND')}</p>
            <h2 id="transfer-details-heading">{t('Make it your kind of coffee.')}</h2>
            <p className="coffee-any-amount">
              {t(
                'Any amount is welcome. Choose it in your banking app; this QR has no fixed amount.'
              )}
            </p>
            <dl>
              <div>
                <dt>{t('Bank')}</dt>
                <dd>{donation.bank}</dd>
              </div>
              <div>
                <dt>{t('Account holder')}</dt>
                <dd>{donation.accountName}</dd>
              </div>
              <div>
                <dt>{t('Account number')}</dt>
                <dd className="donate-copy-row">
                  <span className="donate-account">{donation.accountNumber}</span>
                  <Button
                    aria-label={t('Copy account number')}
                    icon={<CopyOutlined aria-hidden="true" />}
                    onClick={() => copy('account', donation.accountNumber)}
                  />
                </dd>
              </div>
              <div>
                <dt>{t('Transfer note')}</dt>
                <dd className="donate-copy-row">
                  <span>{donation.transferNote}</span>
                  <Button
                    aria-label={t('Copy transfer note')}
                    icon={<CopyOutlined aria-hidden="true" />}
                    onClick={() => copy('note', donation.transferNote)}
                  />
                </dd>
              </div>
            </dl>
            <p
              className={'copy-status' + (result && !result.success ? ' is-error' : '')}
              role="status"
              aria-live="polite"
            >
              {status}
            </p>
            <Alert
              type="info"
              showIcon
              message={t('Check the recipient before confirming.')}
              description={t(
                'Make sure your banking app shows the account holder and account number above. Enter the amount you want to donate.'
              )}
            />
            <p className="donate-status-note">
              {t(
                'QuizMos does not automatically track transfers or confirm receipt. A donation is optional and does not unlock study features.'
              )}
            </p>
          </section>
        </div>
      ) : (
        <section className="donate-unavailable">
          <Alert
            type="info"
            showIcon
            message={t('Donations are not available yet.')}
            description={t(
              'We are checking the transfer details. In the meantime, your next quiz is ready when you are.'
            )}
          />
        </section>
      )}
      <div className="donate-thanks">
        <p>{t('Thank you for being part of QuizMos.')}</p>
        <Button onClick={onReturnHome} icon={<ArrowLeftOutlined aria-hidden="true" />}>
          {t('Back to home')}
        </Button>
      </div>
    </div>
  );
}
