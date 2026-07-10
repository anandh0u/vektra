import React, { useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  ActivityIndicator,
  View,
  StatusBar,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';

const VEKTRA_URL = process.env.EXPO_PUBLIC_WEB_URL || 'https://vektra-six.vercel.app';
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://vektra-api.onrender.com';

type PageState = 'loading' | 'loaded' | 'error';

export default function HomeScreen() {
  const [pageState, setPageState] = useState<PageState>('loading');
  const [canGoBack, setCanGoBack] = useState(false);
  const webviewRef = useRef<WebView>(null);

  const handleError = useCallback(() => setPageState('error'), []);
  const handleLoadStart = useCallback(() => setPageState('loading'), []);
  const handleLoadEnd = useCallback(() => setPageState('loaded'), []);

  const reload = useCallback(() => {
    setPageState('loading');
    webviewRef.current?.reload();
  }, []);

  // Inject a meta tag to make WebView act as mobile app for the site
  const injectedJS = `
    (function() {
      const meta = document.createElement('meta');
      meta.name = 'vektra-native-app';
      meta.content = 'true';
      document.head.appendChild(meta);
      // Expose native bridge flag so the web app knows it's inside a native wrapper
      window.__VEKTRA_NATIVE__ = true;
      window.__VEKTRA_PLATFORM__ = '${Platform.OS}';
    })();
    true;
  `;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0e14" />

      {/* Top Navigation Bar */}
      <View style={styles.navbar}>
        <View style={styles.navLeft}>
          {canGoBack && (
            <TouchableOpacity
              onPress={() => webviewRef.current?.goBack()}
              style={styles.navButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.navIcon}>‹</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.navCenter}>
          <View style={styles.logoRow}>
            <View style={styles.logoDot} />
            <Text style={styles.logoText}>VEKTRA</Text>
          </View>
          <Text style={styles.tagline}>Autonomous AI Forensics</Text>
        </View>

        <View style={styles.navRight}>
          <TouchableOpacity
            onPress={reload}
            style={styles.navButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.navIcon}>↻</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* WebView */}
      <View style={styles.webWrapper}>
        <WebView
          ref={webviewRef}
          source={{ uri: VEKTRA_URL }}
          style={styles.webview}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          onError={handleError}
          onNavigationStateChange={(state) => setCanGoBack(state.canGoBack)}
          domStorageEnabled={true}
          javaScriptEnabled={true}
          injectedJavaScript={injectedJS}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          allowsFullscreenVideo={true}
          pullToRefreshEnabled={true}
          sharedCookiesEnabled={true}
          thirdPartyCookiesEnabled={true}
          cacheEnabled={true}
          originWhitelist={['*']}
          mixedContentMode="always"
          userAgent={`Vektra/${Platform.OS} ReactNative`}
        />

        {/* Loading Overlay */}
        {pageState === 'loading' && (
          <View style={styles.overlay}>
            <View style={styles.loaderBox}>
              <View style={styles.logoDotLarge} />
              <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 16 }} />
              <Text style={styles.loadingText}>Initializing Vektra...</Text>
            </View>
          </View>
        )}

        {/* Error Screen */}
        {pageState === 'error' && (
          <View style={styles.overlay}>
            <View style={styles.errorBox}>
              <Text style={styles.errorIcon}>⚠</Text>
              <Text style={styles.errorTitle}>Connection Failed</Text>
              <Text style={styles.errorMsg}>
                Could not reach Vektra servers.{'\n'}Check your internet connection.
              </Text>
              <TouchableOpacity onPress={reload} style={styles.retryButton}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Bottom Safe Area */}
      <SafeAreaView edges={['bottom']} style={styles.bottomSafe} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0e14',
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0b0e14',
    borderBottomWidth: 1,
    borderBottomColor: '#1e2533',
  },
  navLeft: {
    width: 40,
    alignItems: 'flex-start',
  },
  navRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  navCenter: {
    flex: 1,
    alignItems: 'center',
  },
  navButton: {
    padding: 4,
  },
  navIcon: {
    color: '#60a5fa',
    fontSize: 24,
    fontWeight: '300',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
  },
  logoDotLarge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
  },
  logoText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 3,
  },
  tagline: {
    color: '#4a5568',
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 1,
  },
  webWrapper: {
    flex: 1,
    backgroundColor: '#0b0e14',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0b0e14',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0b0e14',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  loaderBox: {
    alignItems: 'center',
  },
  loadingText: {
    color: '#60a5fa',
    fontSize: 14,
    marginTop: 12,
    letterSpacing: 1,
  },
  errorBox: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorIcon: {
    fontSize: 48,
    color: '#ef4444',
    marginBottom: 16,
  },
  errorTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorMsg: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  bottomSafe: {
    backgroundColor: '#0b0e14',
  },
});
