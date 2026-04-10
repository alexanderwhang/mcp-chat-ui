import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Stack,
  Divider,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';

// Logger utility for consistent logging
const logger = {
  log: (message: string, ...data: any[]) => {
    console.log(`[LOG] [ToolCallBlock] ${message}`, ...data);
  },
  info: (message: string, ...data: any[]) => {
    console.info(`[INFO] [ToolCallBlock] ${message}`, ...data);
  },
  warn: (message: string, ...data: any[]) => {
    console.warn(`[WARN] [ToolCallBlock] ${message}`, ...data);
  },
  error: (message: string, ...data: any[]) => {
    console.error(`[ERROR] [ToolCallBlock] ${message}`, ...data);
  }
};

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
  const [expanded, setExpanded] = useState(false);

  // Log when component mounts
  useEffect(() => {
    logger.log('TOOL CALL BLOCK - Component mounted', {
      name,
      status,
      inputPreview: typeof input === 'string' ? (input as string).substring(0, 50) + '...' : JSON.stringify(input),
      outputPreview: output ? (output as string).substring(0, 50) + '...' : 'undefined'
    });
  }, []);

  // Log when status changes
  useEffect(() => {
    logger.log('TOOL CALL BLOCK - Status updated', {
      name,
      status,
      outputPreview: output ? (output as string).substring(0, 50) + '...' : 'undefined'
    });
  }, [status, output]);

  const handleAccordionChange = (
    _event: React.SyntheticEvent,
    isExpanded: boolean
  ) => {
    logger.log('TOOL CALL BLOCK - Accordion state changed', {
      name,
      expanded: isExpanded
    });
    setExpanded(isExpanded);
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircleRoundedIcon sx={{ fontSize: 16, color: 'success.main' }} />;
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
    <Accordion
      expanded={expanded}
      onChange={handleAccordionChange}
      sx={{
        mt: 2,
        mb: 1,
        borderColor: status === 'error' ? 'error.main' : undefined,
        '&:before': {
          backgroundColor: 'transparent',
        },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          backgroundColor: 'action.hover',
          minHeight: 48,
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ width: '100%' }}
        >
          {getStatusIcon()}
          <Typography
            variant="caption"
            sx={{ fontFamily: 'monospace', fontWeight: 'medium' }}
          >
            {name}
          </Typography>
        </Stack>
      </AccordionSummary>

      <AccordionDetails sx={{ pt: 0 }}>
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
      </AccordionDetails>
    </Accordion>
  );
};

export default ToolCallBlock;