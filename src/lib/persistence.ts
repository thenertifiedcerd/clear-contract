import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "./firebase";
import { SavedContract } from "../types";

export interface PersistentAppState {
  savedContracts: SavedContract[];
  isPro: boolean;
}

const LOCAL_VAULT_KEY = "clearcontract_vault_v1";
const LOCAL_PRO_KEY = "clearcontract_pro_status";
const LOCAL_DEVICE_KEY = "clearcontract_device_id_v1";
const CLOUD_COLLECTION = "clearcontractAppState";

const getLocalStorage = () => {
  if (typeof window === "undefined") return null;
  return window.localStorage;
};

const getDeviceId = () => {
  const storage = getLocalStorage();
  if (!storage) return "server";

  let deviceId = storage.getItem(LOCAL_DEVICE_KEY);
  if (!deviceId) {
    deviceId = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `device_${Math.random().toString(36).slice(2)}`;
    storage.setItem(LOCAL_DEVICE_KEY, deviceId);
  }

  return deviceId;
};

const getContractFingerprint = (contract: SavedContract) => [
  contract.title,
  contract.originalFileName,
  contract.originalText,
  contract.type,
].join("::");

export const mergeContracts = (first: SavedContract[], second: SavedContract[]) => {
  const deduped = new Map<string, SavedContract>();
  [...second, ...first].forEach((contract) => {
    deduped.set(getContractFingerprint(contract), contract);
  });
  return Array.from(deduped.values());
};

export const readLocalPersistentState = (): PersistentAppState => {
  const storage = getLocalStorage();
  if (!storage) {
    return { savedContracts: [], isPro: false };
  }

  try {
    const rawVault = storage.getItem(LOCAL_VAULT_KEY);
    const savedContracts = rawVault ? JSON.parse(rawVault) : [];
    const isPro = storage.getItem(LOCAL_PRO_KEY) === "true";

    return {
      savedContracts: Array.isArray(savedContracts) ? savedContracts : [],
      isPro,
    };
  } catch (error) {
    console.error("Failed to read local persistent state:", error);
    return { savedContracts: [], isPro: false };
  }
};

export const writeLocalPersistentState = (state: PersistentAppState) => {
  const storage = getLocalStorage();
  if (!storage) return;

  storage.setItem(LOCAL_VAULT_KEY, JSON.stringify(state.savedContracts));
  storage.setItem(LOCAL_PRO_KEY, String(state.isPro));
};

const getStateDocRef = (userId?: string | null) => {
  const db = getFirebaseDb();
  if (!db) return null;
  return doc(db, CLOUD_COLLECTION, userId || getDeviceId());
};

export const loadPersistentState = async (userId?: string | null): Promise<PersistentAppState> => {
  const localState = readLocalPersistentState();
  const stateDoc = getStateDocRef(userId);

  if (!stateDoc) {
    return localState;
  }

  try {
    const snapshot = await getDoc(stateDoc);
    if (!snapshot.exists()) {
      return localState;
    }

    const remote = snapshot.data() as Partial<PersistentAppState>;
    return {
      savedContracts: mergeContracts(
        localState.savedContracts,
        Array.isArray(remote.savedContracts) ? remote.savedContracts : []
      ),
      isPro: localState.isPro || Boolean(remote.isPro),
    };
  } catch (error) {
    console.warn("Firebase cache load failed, continuing with local state:", error);
    return localState;
  }
};

export const savePersistentState = async (state: PersistentAppState, userId?: string | null) => {
  writeLocalPersistentState(state);

  const stateDoc = getStateDocRef(userId);
  if (!stateDoc) {
    return;
  }

  try {
    await setDoc(stateDoc, {
      savedContracts: state.savedContracts,
      isPro: state.isPro,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.warn("Firebase cache save failed, local state kept:", error);
  }
};