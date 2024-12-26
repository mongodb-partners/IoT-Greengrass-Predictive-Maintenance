import React from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

const Loader = () => {
    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 9999,
                width: '100%',
                height: '100%',
            }}
        >
            <CircularProgress
                size={50}
                style={{ color: '#00684A' }}  
            />
        </Box>
    );
};

export default Loader;