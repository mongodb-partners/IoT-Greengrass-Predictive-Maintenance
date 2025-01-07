import {useCallback, useState} from 'react';

export function useTabManager() {
  const [selectedStatus, setStatus] = useState('TODO');
  const setSelectedStatus = useCallback(
    (status: string) => {
      setStatus(status);
    },
    [selectedStatus],
  );

  return {
    setSelectedStatus,
    selectedStatus,
  };
}
