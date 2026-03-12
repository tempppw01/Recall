export function applyRemoteSyncPayload(params: {
  remotePayload: any;
  applyImportedData: (payload: any, mode: 'merge' | 'overwrite') => void;
  applySyncedSettings: (payload: any) => void;
}) {
  const { remotePayload, applyImportedData, applySyncedSettings } = params;
  if (!remotePayload) return false;
  applyImportedData(remotePayload, 'merge');
  applySyncedSettings(remotePayload);
  return true;
}
