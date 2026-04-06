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
  SvgIcon,
  type SvgIconProps,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

function ToolsIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M3 17h2v-7H3v7zm4 0h2v-12H7v12zm4 0h2V4h-2v13zm4 0h2v-9h-2v9zm4 0h2V8h-2v9z" />
    </SvgIcon>
  );
}

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
          <ToolsIcon fontSize="small" />
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
                  <ToolsIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography fontWeight="medium">{tool.name}</Typography>
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
                  secondary={tool.description}
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