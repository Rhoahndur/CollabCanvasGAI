import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { get, ref, set } from 'firebase/database';

const hasDatabaseEmulator = Boolean(process.env.FIREBASE_DATABASE_EMULATOR_HOST);
const describeWithEmulator = hasDatabaseEmulator ? describe : describe.skip;

let testEnv;
let assertSucceeds;
let assertFails;

const projectId = `collabcanvas-rules-${Date.now()}`;
const canvasId = 'canvas1';

async function seedCanvas() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.database();
    await set(ref(db, `canvases/${canvasId}`), {
      metadata: {
        name: 'Rules Test Canvas',
        createdBy: 'owner',
        createdAt: 1,
        lastModified: 1,
      },
      permissions: {
        owner: 'owner',
        editor: 'editor',
        viewer: 'viewer',
      },
      shareTokens: {
        viewerToken: {
          role: 'viewer',
          createdBy: 'owner',
          createdAt: 1,
        },
        editorToken: {
          role: 'editor',
          createdBy: 'owner',
          createdAt: 1,
        },
      },
      objects: {
        shape1: {
          id: 'shape1',
          type: 'rectangle',
          x: 10,
          y: 10,
          width: 50,
          height: 50,
          createdBy: 'owner',
        },
      },
    });

    await set(ref(db, `userCanvases/owner/${canvasId}`), {
      name: 'Rules Test Canvas',
      role: 'owner',
      lastAccessed: 1,
      starred: false,
    });
  });
}

describeWithEmulator('database.rules.json', () => {
  beforeAll(async () => {
    const rulesTesting = await import('@firebase/rules-unit-testing');
    assertSucceeds = rulesTesting.assertSucceeds;
    assertFails = rulesTesting.assertFails;

    testEnv = await rulesTesting.initializeTestEnvironment({
      projectId,
      database: {
        rules: readFileSync('database.rules.json', 'utf8'),
      },
    });
  });

  beforeEach(async () => {
    await testEnv.clearDatabase();
    await seedCanvas();
  });

  afterAll(async () => {
    await testEnv?.cleanup();
  });

  it('blocks self-authorizing into a known canvas ID without a share token', async () => {
    const db = testEnv.authenticatedContext('intruder').database();

    await assertFails(set(ref(db, `canvases/${canvasId}/permissions/intruder`), 'editor'));
    await assertFails(
      set(ref(db, `userCanvases/intruder/${canvasId}`), {
        name: 'Rules Test Canvas',
        role: 'editor',
        lastAccessed: 1,
        starred: false,
      })
    );
  });

  it('allows owner-managed permissions and share tokens', async () => {
    const db = testEnv.authenticatedContext('owner').database();

    await assertSucceeds(set(ref(db, `canvases/${canvasId}/permissions/newViewer`), 'viewer'));
    await assertSucceeds(
      set(ref(db, `canvases/${canvasId}/shareTokens/newToken`), {
        role: 'viewer',
        createdBy: 'owner',
        createdAt: 2,
      })
    );
  });

  it('allows a valid share token to grant only the token role', async () => {
    const db = testEnv.authenticatedContext('alice').database();

    await assertSucceeds(get(ref(db, `canvases/${canvasId}/shareTokens/viewerToken`)));
    await assertSucceeds(
      set(ref(db, `canvases/${canvasId}/permissions/alice`), {
        role: 'viewer',
        token: 'viewerToken',
        userName: 'Alice',
        grantedVia: 'share-link',
        grantedAt: 2,
      })
    );
    await assertSucceeds(
      set(ref(db, `userCanvases/alice/${canvasId}`), {
        name: 'Rules Test Canvas',
        role: 'viewer',
        lastAccessed: 2,
        starred: false,
      })
    );

    await assertFails(
      set(ref(db, `canvases/${canvasId}/permissions/bob`), {
        role: 'editor',
        token: 'viewerToken',
        userName: 'Bob',
        grantedVia: 'share-link',
        grantedAt: 2,
      })
    );
  });

  it('restricts object writes to owners and editors', async () => {
    const ownerDb = testEnv.authenticatedContext('owner').database();
    const editorDb = testEnv.authenticatedContext('editor').database();
    const viewerDb = testEnv.authenticatedContext('viewer').database();

    await assertSucceeds(
      set(ref(ownerDb, `canvases/${canvasId}/objects/ownerShape`), {
        id: 'ownerShape',
        type: 'rectangle',
        createdBy: 'owner',
      })
    );
    await assertSucceeds(
      set(ref(editorDb, `canvases/${canvasId}/objects/editorShape`), {
        id: 'editorShape',
        type: 'rectangle',
        createdBy: 'editor',
      })
    );
    await assertFails(
      set(ref(viewerDb, `canvases/${canvasId}/objects/viewerShape`), {
        id: 'viewerShape',
        type: 'rectangle',
        createdBy: 'viewer',
      })
    );
  });

  it('restricts presence and cursor writes to canvas members writing their own userId', async () => {
    const viewerDb = testEnv.authenticatedContext('viewer').database();
    const intruderDb = testEnv.authenticatedContext('intruder').database();

    await assertSucceeds(
      set(ref(viewerDb, `canvases/${canvasId}/presence/session1`), {
        sessionId: 'session1',
        userId: 'viewer',
        userName: 'Viewer',
        isOnline: true,
        isActive: true,
        lastSeen: 2,
      })
    );
    await assertSucceeds(
      set(ref(viewerDb, `canvases/${canvasId}/cursors/session1`), {
        sessionId: 'session1',
        userId: 'viewer',
        userName: 'Viewer',
        x: 1,
        y: 1,
        timestamp: 2,
        isActive: true,
      })
    );

    await assertFails(
      set(ref(viewerDb, `canvases/${canvasId}/presence/session2`), {
        sessionId: 'session2',
        userId: 'owner',
        userName: 'Owner',
        isOnline: true,
        isActive: true,
        lastSeen: 2,
      })
    );
    await assertFails(
      set(ref(intruderDb, `canvases/${canvasId}/cursors/session3`), {
        sessionId: 'session3',
        userId: 'intruder',
        userName: 'Intruder',
        x: 1,
        y: 1,
        timestamp: 2,
        isActive: true,
      })
    );
  });
});
