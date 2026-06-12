export const MaxAdContentRating = { G: 'G', PG: 'PG', T: 'T', MA: 'MA' };
export const BannerAd = () => null;
export const BannerAdSize = {};
export const InterstitialAd = { createForAdRequest: () => ({ load: () => {}, show: () => {}, addAdEventListener: () => () => {} }) };
export const RewardedAd = { createForAdRequest: () => ({ load: () => {}, show: () => {}, addAdEventListener: () => () => {} }) };
export const AdEventType = {};
export const RewardedAdEventType = {};
export const TestIds = {};
export default () => ({
  setRequestConfiguration: () => Promise.resolve(),
  initialize: () => Promise.resolve([]),
});
