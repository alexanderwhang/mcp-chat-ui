import React from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import BuildIcon from '@mui/icons-material/Build';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

export interface ChatAccordionProps {
  mcpTools?: any[];
}

export const ChatAccordion: React.FC<ChatAccordionProps> = ({
  mcpTools = [],
}) => {
  return (
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BuildIcon fontSize="small" />
          Available Tools
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        {mcpTools.length === 0 ? (
          <Typography color="text.secondary">
            No tools available. Connect to an MCP server to see available tools.
          </Typography>
        ) : (
          <List disablePadding sx={{ fontSize: '0.9rem' }}>
            {mcpTools.map((tool, index) => (
              <ListItem
                key={index}
                sx={{
                  py: 1,
                  px: 2,
                  backgroundColor: 'action.hover',
                  borderRadius: 1,
                  mb: 1,
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <BuildIcon fontSize="small" />
                </ListItemIcon>
                 <ListItemText
                   primary={
                     <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                       <Typography fontWeight="medium">{typeof tool === 'object' && 'function' in tool ? tool.function.name : tool.name}</Typography>
                      {tool.tags && tool.tags.length > 0 && (
                        <Chip
                          label={tool.tags[0]}
                          size="small"
                          sx={{
                            fontSize: '0.7rem',
                            height: 18,
                          }}
                        />
                      )}
                    </Box>
                  }
                  secondary={typeof tool === 'object' && 'function' in tool ? tool.function.description : tool.description}
                  secondaryTypographyProps={{
                    sx: {
                      fontSize: '0.8rem',
                      color: 'text.secondary',
                    },
                  }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

export default ChatAccordion;