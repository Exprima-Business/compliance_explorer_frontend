import React from 'react';
import { Card, CardContent, Typography, Box, Chip, Link, Divider, Paper, Stack, IconButton, Button } from '@mui/material';
import type { SxProps } from '@mui/system';
import type { Theme } from '@mui/material/styles';
import DescriptionIcon from '@mui/icons-material/Description';
import SecurityIcon from '@mui/icons-material/Security';
import CategoryIcon from '@mui/icons-material/Category';
import LinkIcon from '@mui/icons-material/Link';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import CloseIcon from '@mui/icons-material/Close';
import type { Clause } from '../types/clause';
import { useBookmarks } from '../contexts/BookmarkContext';

interface ClauseCardProps {
  clause: Clause;
  onBookmarkToggle?: () => void;
  onClose?: () => void;
  sx?: SxProps<Theme>;
  compact?: boolean;
}

export const ClauseCard = ({ clause, onBookmarkToggle, onClose, sx, compact = false }: ClauseCardProps) => {
  const { isClauseBookmarked, toggleBookmark } = useBookmarks();
  
  // Determine bookmark status from BookmarkContext
  const isBookmarked = isClauseBookmarked(clause.id);
  
  const handleBookmarkToggle = () => {
    if (onBookmarkToggle) {
      onBookmarkToggle();
    } else {
      toggleBookmark(clause.id);
    }
  };
  const renderField = (label: string, value: string | string[]) => {
    if (!value) return null;
    
    return (
      <Paper 
        elevation={0}
        sx={{ 
          mb: 3, 
          p: 2.5,
          bgcolor: 'rgba(99, 102, 241, 0.03)',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1.4,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            bgcolor: 'rgba(99, 102, 241, 0.05)',
            transform: 'translateY(-1px)',
          }
        }}
      >
        <Typography 
          variant="subtitle1" 
          color="primary" 
          gutterBottom
          sx={{ 
            fontWeight: 600,
            letterSpacing: '0.02em',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: 2
          }}
        >
          {label}
        </Typography>
        {Array.isArray(value) ? (
          <Box component="ul" sx={{ pl: 2, m: 0 }}>
            {value.map((item, index) => (
              <Typography 
                component="li" 
                variant="body2" 
                key={index} 
                paragraph
                sx={{ 
                  color: 'text.secondary',
                  lineHeight: 1.7,
                  '&:last-child': { mb: 0 }
                }}
              >
                {item}
              </Typography>
            ))}
          </Box>
        ) : (
          <Typography 
            variant="body2" 
            paragraph
            sx={{ 
              color: 'text.secondary',
              lineHeight: 1.7,
              mb: 0
            }}
          >
            {value}
          </Typography>
        )}
      </Paper>
    );
  };

  if (compact) {
    return (
      <Card 
        elevation={0}
        sx={{ 
          bgcolor: 'transparent',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            bgcolor: 'rgba(99, 102, 241, 0.03)',
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          },
          ...sx
        }}
      >
        <CardContent sx={{ 
          p: 2.5, 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center',
          minHeight: 90,
          '&:last-child': {
            pb: 2.5
          }
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mt: 1.25 }}>
            <Box sx={{ flex: 1 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'primary.main',
                  mb: 0.5,
                  transition: 'color 0.2s ease-in-out',
                  '&:hover': {
                    color: 'secondary.main',
                  }
                }}
              >
                {clause.clauseCode}
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontSize: '0.85rem',
                  color: 'text.primary',
                  lineHeight: 1.4,
                  mb: 0.75,
                  transition: 'color 0.2s ease-in-out',
                }}
              >
                {clause.title}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2.5 }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 0.75,
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                  }
                }}>
                  <CategoryIcon sx={{ 
                    color: 'primary.main', 
                    fontSize: 16,
                    transition: 'color 0.2s ease-in-out',
                  }} />
                  <Typography variant="caption" sx={{ 
                    color: 'text.secondary', 
                    fontSize: '0.75rem',
                    transition: 'color 0.2s ease-in-out',
                  }}>
                    {clause.family?.name || 'No Family'}
                  </Typography>
                </Box>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 0.75,
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                  }
                }}>
                  <SecurityIcon sx={{ 
                    color: clause.riskClassification === 'HIGH' ? 'error.main' : 'warning.main',
                    fontSize: 16,
                    transition: 'color 0.2s ease-in-out',
                  }} />
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: clause.riskClassification === 'HIGH' ? 'error.main' : 'warning.main',
                      fontSize: '0.75rem',
                      transition: 'color 0.2s ease-in-out',
                    }}
                  >
                    {clause.riskClassification}
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <IconButton
                onClick={handleBookmarkToggle}
                sx={{
                  color: isBookmarked ? 'secondary.main' : 'text.secondary',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    color: 'secondary.main',
                    transform: 'scale(1.1)',
                  },
                }}
              >
                {isBookmarked ? <BookmarkIcon /> : <BookmarkBorderIcon />}
              </IconButton>
              {onClose && (
                <IconButton
                  onClick={onClose}
                  sx={{
                    color: 'text.secondary',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      color: 'error.main',
                      transform: 'scale(1.1)',
                    },
                  }}
                >
                  <CloseIcon />
                </IconButton>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      elevation={0}
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        bgcolor: 'linear-gradient(135deg, #f8fafc 60%, #e0e7ff 100%)',
        borderRadius: 3,
        boxShadow: '0 2px 8px 0 rgba(0,184,217,0.08), 0 8px 24px 0 rgba(109,91,255,0.08)',
        transition: 'transform 0.18s cubic-bezier(0.4,0,0.2,1), box-shadow 0.18s cubic-bezier(0.4,0,0.2,1)',
        '&:hover, &:focus-within': {
          transform: 'scale(1.025)',
          boxShadow: '0 8px 32px 0 rgba(0,184,217,0.13), 0 16px 48px 0 rgba(127,57,251,0.13)',
        },
        ...sx
      }}
    >
      <CardContent sx={{ flexGrow: 1, overflow: 'auto', p: 0 }}>
        {/* Metadata Section */}
        <Paper
          elevation={0}
          sx={{
            mb: 3,
            p: 2.5,
            bgcolor: 'rgba(0,184,217,0.04)',
            border: '1.5px solid',
            borderColor: 'divider',
            borderRadius: 2.2,
            boxShadow: '0 1.5px 6px 0 rgba(127,57,251,0.06)',
            borderBottom: '1px solid rgba(0,184,217,0.13)',
          }}
        >
          <Stack spacing={2}>
            {/* Clause ID and Title */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    color: 'primary.main',
                    mb: 1,
                    fontSize: '1.25rem',
                    lineHeight: 1.1,
                  }}
                >
                  {clause.clauseCode}
                </Typography>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 600,
                    color: 'text.primary',
                  }}
                >
                  {clause.title}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {onBookmarkToggle && (
                  <IconButton 
                    onClick={handleBookmarkToggle}
                    sx={{ 
                      color: isBookmarked ? 'primary.main' : 'text.secondary',
                      transition: 'transform 0.18s cubic-bezier(0.4,0,0.2,1), color 0.18s cubic-bezier(0.4,0,0.2,1)',
                      '&:hover, &:focus': {
                        color: 'secondary.main',
                        transform: 'scale(1.18)',
                      }
                    }}
                  >
                    {isBookmarked ? <BookmarkIcon /> : <BookmarkBorderIcon />}
                  </IconButton>
                )}
                {onClose && (
                  <IconButton 
                    onClick={onClose}
                    sx={{ 
                      color: 'text.secondary',
                      transition: 'transform 0.18s cubic-bezier(0.4,0,0.2,1), color 0.18s cubic-bezier(0.4,0,0.2,1)',
                      '&:hover, &:focus': {
                        color: 'error.main',
                        transform: 'scale(1.18)',
                      }
                    }}
                  >
                    <CloseIcon />
                  </IconButton>
                )}
              </Box>
            </Box>

            {/* Metadata Grid */}
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: 2,
              mt: 2
            }}>
              {/* Family */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CategoryIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Family
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {clause.family?.name || 'No Family'}
                  </Typography>
                </Box>
              </Box>

              {/* Risk Classification */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SecurityIcon sx={{ 
                  color: clause.riskClassification === 'HIGH' ? 'error.main' : 'warning.main',
                  fontSize: 20 
                }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Risk Level
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: 500,
                      color: clause.riskClassification === 'HIGH' ? 'error.main' : 'warning.main'
                    }}
                  >
                    {clause.riskClassification}
                  </Typography>
                </Box>
              </Box>

              {/* Reference URL */}
              {clause.referenceUrl && (
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  gridColumn: 'span 2'
                }}>
                  <LinkIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Reference
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Button
                        href={clause.referenceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="small"
                        variant="outlined"
                        sx={{
                          fontSize: '0.75rem',
                          textTransform: 'none',
                          color: 'primary.main',
                          borderColor: 'rgba(0,184,217,0.3)',
                          bgcolor: 'rgba(0,184,217,0.05)',
                          '&:hover': {
                            bgcolor: 'rgba(0,184,217,0.1)',
                            borderColor: 'rgba(0,184,217,0.5)',
                          },
                        }}
                      >
                        View Full Text
                      </Button>
                    </Box>
                  </Box>
                </Box>
              )}
            </Box>
          </Stack>
        </Paper>

        {/* Content Sections */}
        {renderField('Description', clause.description)}
        {renderField('Intent', clause.intent)}
        {renderField('Conditions', clause.conditions)}
        {renderField('Implementation Guidance', clause.implementationGuidance)}
        {renderField('Assessment Method', clause.assessmentMethod)}
        {renderField('Penalties', clause.metadata?.penalties)}
      </CardContent>
    </Card>
  );
}; 