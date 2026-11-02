export function validDonation(config) {
  return !!(
    config?.enabled === true &&
    typeof config.bank === 'string' &&
    config.bank.trim() &&
    /^\d{6}$/.test(config.bankBin) &&
    typeof config.accountNumber === 'string' &&
    /^\d{1,19}$/.test(config.accountNumber) &&
    typeof config.accountName === 'string' &&
    config.accountName.trim() &&
    typeof config.transferNote === 'string' &&
    /^[A-Z0-9 ]{1,50}$/.test(config.transferNote) &&
    typeof config.qrAsset === 'string' &&
    /^donate\/[a-z0-9-]+\.png$/.test(config.qrAsset)
  );
}
