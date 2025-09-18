export type DataSharingLevel = 'None' | 'Low' | 'Medium' | 'High';

const DS_TRACKER_WEIGHT = 2;
const DS_THIRDPARTY_WEIGHT = 1;
const DS_COOKIE_WEIGHT = 1;
const DS_THRESH_LOW = 3;
const DS_THRESH_MED = 8;

export const computeDataSharingLevel = (
  trackerCount: number,
  thirdPartyCount: number,
  cookieCount: number,
): DataSharingLevel => {
  const index = trackerCount * DS_TRACKER_WEIGHT + thirdPartyCount * DS_THIRDPARTY_WEIGHT + cookieCount * DS_COOKIE_WEIGHT;
  if (index === 0) return 'None';
  if (index <= DS_THRESH_LOW) return 'Low';
  if (index <= DS_THRESH_MED) return 'Medium';
  return 'High';
};
