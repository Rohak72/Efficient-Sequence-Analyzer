import * as React from 'react';
import Box from '@mui/material/Box';
import { SingleSeqForm } from './SingleSeqForm'
import { MultiSeqForm } from './MultiSeqForm'

// The TabPanel is perfect as is.
function CustomTabPanel(props: { children?: React.ReactNode; index: number; value: number }) {
  const { children, value, index } = props;
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ p: 3, width: '100%' }}>{children}</Box>}
    </div>
  );
}

export const FormOverhead: React.FC = () => {
  const [value, setValue] = React.useState(0);

  // === THE CONTROL CENTER ===
  // Here's how you control everything. The index of each array corresponds to a tab.
  const tabs = ['Single Sequence', 'Multi-FASTA'];
  const tabColors = ['#fc5391', '#A755F7']; // Red ('#d32f2f'), Blue ('#1976d2')
  const tabGlows = ['rgba(252, 83, 145, 0.45)', 'rgba(167, 85, 247, 0.45)']; // Red Glow, Blue Glow

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>

      {/* 1. The Main Container - The hover glow now uses the ACTIVE tab's color */}
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          height: 64,
          bgcolor: 'grey.200',
          p: '4px',
          borderRadius: '99px',
          width: { xs: '90%', sm: 475 },
          cursor: 'pointer',
          transition: 'box-shadow 0.3s ease',
          '&:hover': {
            // THE MAGIC IS HERE: The glow color changes based on the active tab (value)
            boxShadow: `0px 4px 20px ${tabGlows[value]}`,
          },
        }}
      >
        {/* 2. The Sliding Pill - Its color now comes from our array */}
        <Box
          sx={{
            position: 'absolute',
            top: '4px',
            left: '4px',
            width: 'calc(50% - 4px)',
            height: 'calc(100% - 8px)',
            // AND THE MAGIC IS HERE: We use the `value` to pick a color from our array
            bgcolor: tabColors[value],
            borderRadius: '99px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            transition: 'transform 0.3s cubic-bezier(0.65, 0, 0.35, 1), background-color 0.3s ease',
            transform: `translateX(${value * 100}%)`,
          }}
        />

        {/* 3. The Text Labels - The logic here remains mostly the same */}
        {tabs.map((label, index) => (
          <Box
            key={index}
            onClick={() => setValue(index)}
            sx={{
              position: 'relative',
              zIndex: 2,
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '1.3rem',
              // The text is white when the slider is on it, and dark otherwise. Perfect.
              color: value === index ? 'white' : 'text.primary',
              transition: 'color 0.3s ease-in-out',
              lineHeight: '1.2',
            }}
          >
            {label}
          </Box>
        ))}
      </Box>

      {/* The content panels */}
      <CustomTabPanel value={value} index={0}>
        <SingleSeqForm />
      </CustomTabPanel>
      <CustomTabPanel value={value} index={1}>
        <MultiSeqForm />
      </CustomTabPanel>
    </Box>
  );
};