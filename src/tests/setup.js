/**
 * Vitest global setup — runs before every test file
 */
// @testing-library/jest-dom adds custom DOM matchers (toBeInTheDocument, etc.)
// Skipped to reduce memory footprint — tests use native DOM queries instead

// ── Firebase mocks ──────────────────────────────────────────────────────────
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
  getApps: vi.fn(() => []),
  getApp: vi.fn(() => ({})),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    currentUser: null,
    onAuthStateChanged: vi.fn(),
  })),
  onAuthStateChanged: vi.fn((_auth, cb) => {
    cb(null);
    return vi.fn();
  }),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  GithubAuthProvider: vi.fn(),
  GoogleAuthProvider: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  enableIndexedDbPersistence: vi.fn(() => Promise.resolve()),
}));

vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({})),
  ref: vi.fn(() => ({})),
  set: vi.fn(() => Promise.resolve()),
  update: vi.fn(() => Promise.resolve()),
  remove: vi.fn(() => Promise.resolve()),
  get: vi.fn(() => Promise.resolve({ exists: () => false, val: () => null })),
  onValue: vi.fn((_ref, cb) => {
    cb({ val: () => null, exists: () => false });
    return vi.fn();
  }),
  off: vi.fn(),
  query: vi.fn(),
  orderByChild: vi.fn(),
  onDisconnect: vi.fn(() => ({
    set: vi.fn(() => Promise.resolve()),
    remove: vi.fn(() => Promise.resolve()),
  })),
}));

// Mock our Firebase service module
vi.mock('../services/firebase', () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: vi.fn(),
  },
  db: {},
  realtimeDb: {},
  githubProvider: {},
  googleProvider: {},
  signInWithGitHub: vi.fn(),
  signInWithGoogle: vi.fn(),
  signOutUser: vi.fn(() => Promise.resolve()),
}));

// ── Browser API mocks (only in browser-like environments) ───────────────────
if (typeof window === 'undefined') {
  // Node environment — skip browser mocks
} else {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((q) => ({
      matches: false,
      media: q,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // localStorage spy-able mock
  const localStorageMock = (() => {
    let store = {};
    return {
      getItem: vi.fn((key) => store[key] ?? null),
      setItem: vi.fn((key, val) => {
        store[key] = String(val);
      }),
      removeItem: vi.fn((key) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      }),
      get length() {
        return Object.keys(store).length;
      },
      key: vi.fn((i) => Object.keys(store)[i] ?? null),
    };
  })();
  Object.defineProperty(window, 'localStorage', { value: localStorageMock });

  // SVGElement.getBBox (not in jsdom)
  if (typeof SVGElement !== 'undefined') {
    SVGElement.prototype.getBBox = vi.fn(() => ({ x: 0, y: 0, width: 100, height: 100 }));
  }

  // HTMLCanvasElement.getContext (for canvasCapture)
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
    putImageData: vi.fn(),
    createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
    setTransform: vi.fn(),
    resetTransform: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    transform: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
  }));

  HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/jpeg;base64,mock');
} // end if (typeof window !== 'undefined')
