import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

let GoogleAds = null;
try {
  GoogleAds = require('react-native-google-mobile-ads');
} catch {
  // Expo Go özel native reklam modülünü içermez; yer tutucu gösterilir.
}

let initializationPromise = null;
const initializeAds = () => {
  if (!GoogleAds) return Promise.resolve(false);
  if (!initializationPromise) {
    initializationPromise = (async () => {
      let consentInfo = null;
      try {
        // UMP bilgisi her uygulama açılışında yenilenir ve gerekiyorsa Google'ın
        // onay formu reklam yüklenmeden önce gösterilir.
        consentInfo = await GoogleAds.AdsConsent.gatherConsent();
      } catch {
        // Ağ hatasında önceki oturumdaki geçerli seçim kullanılabilir.
        try {
          consentInfo = await GoogleAds.AdsConsent.getConsentInfo();
        } catch {}
      }

      if (!consentInfo?.canRequestAds) return false;
      await GoogleAds.default().initialize();
      return true;
    })().catch(() => false);
  }
  return initializationPromise;
};

const configuredBannerId = Platform.select({
  ios: process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS_ID,
  android: process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID_ID,
});
const configuredInterstitialId = Platform.select({
  ios: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS_ID,
  android: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID_ID,
});

export function FuduBannerAd({ language = 'tr' }) {
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    initializeAds().then((canShowAds) => {
      if (mounted) setReady(canShowAds);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!GoogleAds || !ready || failed || (!__DEV__ && !configuredBannerId)) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderLabel}>{language === 'en' ? 'ADVERTISEMENT' : 'REKLAM'}</Text>
        <Text style={styles.placeholderBrand}>FUDU HEX</Text>
      </View>
    );
  }

  const { BannerAd, BannerAdSize, TestIds } = GoogleAds;
  return (
    <View style={styles.bannerContainer}>
      <BannerAd
        unitId={__DEV__ ? TestIds.ADAPTIVE_BANNER : configuredBannerId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
}

export function useFuduInterstitial() {
  const interstitialRef = useRef(null);
  const loadedRef = useRef(false);
  const closeCallbackRef = useRef(null);

  useEffect(() => {
    if (!GoogleAds || (!__DEV__ && !configuredInterstitialId)) return undefined;
    let active = true;
    let unsubscribeLoaded = () => {};
    let unsubscribeClosed = () => {};
    let unsubscribeError = () => {};

    initializeAds().then((canShowAds) => {
      if (!active || !canShowAds) return;
      const { AdEventType, InterstitialAd, TestIds } = GoogleAds;
      const advert = InterstitialAd.createForAdRequest(
        __DEV__ ? TestIds.INTERSTITIAL : configuredInterstitialId,
        { requestNonPersonalizedAdsOnly: true }
      );
      interstitialRef.current = advert;

      unsubscribeLoaded = advert.addAdEventListener(AdEventType.LOADED, () => {
        loadedRef.current = true;
      });
      unsubscribeClosed = advert.addAdEventListener(AdEventType.CLOSED, () => {
        loadedRef.current = false;
        const callback = closeCallbackRef.current;
        closeCallbackRef.current = null;
        if (callback) callback();
        advert.load();
      });
      unsubscribeError = advert.addAdEventListener(AdEventType.ERROR, () => {
        loadedRef.current = false;
        const callback = closeCallbackRef.current;
        closeCallbackRef.current = null;
        if (callback) callback();
      });
      advert.load();
    });

    return () => {
      active = false;
      unsubscribeLoaded();
      unsubscribeClosed();
      unsubscribeError();
      interstitialRef.current = null;
      loadedRef.current = false;
      closeCallbackRef.current = null;
    };
  }, []);

  const showInterstitial = useCallback((onClosed) => {
    const advert = interstitialRef.current;
    if (!advert || !loadedRef.current) return false;
    closeCallbackRef.current = onClosed || null;
    loadedRef.current = false;
    advert.show().catch(() => {
      const callback = closeCallbackRef.current;
      closeCallbackRef.current = null;
      if (callback) callback();
      advert.load();
    });
    return true;
  }, []);

  return showInterstitial;
}

const styles = StyleSheet.create({
  bannerContainer: {
    width: '100%',
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#3D1022',
    borderRadius: 13,
  },
  placeholder: {
    width: '100%',
    height: 50,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3D1022',
    borderWidth: 1,
    borderColor: '#793249',
  },
  placeholderLabel: {
    color: '#B97879',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 2,
  },
  placeholderBrand: {
    color: '#E8AD94',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginTop: 2,
  },
});
