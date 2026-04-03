import React from 'react';
import { Box, Paper, Typography, Stack, Divider, CircularProgress } from '@mui/material';

/**
 * Props for ToolCallBlock component
 */
export interface ToolCallBlockProps {
  name: string;
  input: Record<string, unknown>;
  output?: string;
  status: 'executing' | 'success' | 'error';
}

/**
 * Component to display a tool call with its input, output, and status
 */
export const ToolCallBlock: React.FC<ToolCallBlockProps> = ({
  name,
  input,
  output,
  status,
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return '\u2713';
      case 'error':
        return '\u2717';
      case 'executing':
        return <CircularProgress size={14} />;
      default:
        return '\u2026';
    }
  };

  const formatInput = (data: unknown): string => {
    if (typeof data === 'string') return data;
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  const formatOutput = (data: unknown): string => {
    if (typeof data === 'string') return data;
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        mt: 2,
        mb: 2,
        borderColor: status === 'error' ? 'error.main' : undefined,
      }}
    >
      <Box sx={{ p: 2, backgroundColor: 'action.hover' }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
            Tool:
          </Typography>
          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
            {name}
          </Typography>
        </Stack>
      </Box>

      <Divider />

      <Box sx={{ p: 2 }}>
        <Typography variant="caption" sx={{ fontWeight: 'bold', mr: 1 }}>
          Input:
        </Typography>
        <Box
          component="pre"
          sx={{
            m: 0,
            p: 1,
            backgroundColor: 'background.paper',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            fontSize: '0.75rem',
            overflowX: 'auto',
          }}
        >
          {formatInput(input)}
        </Box>
      </Box>

      {status !== 'executing' && output !== undefined && (
        <>
          <Divider />

          <Box sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
              <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                Output:
              </Typography>
              <Typography
                variant="caption"
                color={status === 'success' ? 'success.main' : 'error.main'}
              >
                {getStatusIcon()}
              </Typography>
            </Stack>
            <Box
              component="pre"
              sx={{
                m: 0,
                p: 1,
                backgroundColor: 'background.default',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                fontSize: '0.75rem',
                overflowX: 'auto',
              }}
            >
              {formatOutput(output)}
            </Box>
          </Box>
        </>
      )}

      {status === 'executing' && (
        <>
          <Divider />

          <Box sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                Status:
              </Typography>
               <Typography
                 variant="caption"
                 color="info.main"
                 className="pulseFade"
               >
                 Executing...
               </Typography>
            </Stack>
          </Box>
        </>
      )}
    </Paper>
  );
};

export default ToolCallBlock;