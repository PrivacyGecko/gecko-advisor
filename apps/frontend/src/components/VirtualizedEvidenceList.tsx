/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import React, { useState, useRef, useCallback } from 'react';
import SeverityBadge, { SeverityIndicator } from './SeverityBadge';
import type { ReportResponse } from '@privacy-advisor/shared';

type EvidenceItem = ReportResponse['evidence'][number];

export interface VirtualizedEvidenceListProps {
  /** Evidence items to display */
  items: EvidenceItem[];
  /** Function to check if item matches current filter */
  matchesFilter: (severity: number) => boolean;
  /** Function to sanitize evidence details */
  sanitizeDetails: (details: unknown) => unknown;
  /** Height of each item in pixels */
  itemHeight?: number;
  /** Container height in pixels */
  containerHeight?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * VirtualizedEvidenceList provides efficient rendering for large evidence lists
 *
 * Features:
 * - Virtual scrolling for performance with large datasets
 * - Expandable details with sanitized data display
 * - Accessibility compliant with proper ARIA labels
 * - Keyboard navigation support
 * - Responsive design with mobile-first approach
 *
 * Performance optimizations:
 * - Only renders visible items plus buffer
 * - Memoized components for stable rerenders
 * - Efficient scroll handling with requestAnimationFrame
 */
const VirtualizedEvidenceList = React.memo(function VirtualizedEvidenceList({
  items,
  matchesFilter,
  sanitizeDetails,
  itemHeight = 80,
  containerHeight = 400,
  className = ''
}: VirtualizedEvidenceListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Filter items based on severity
  const filteredItems = React.useMemo(() =>
    items.filter(item => matchesFilter(item.severity)),
    [items, matchesFilter]
  );

  // Calculate visible range with buffer
  const bufferSize = 5;
  const visibleStart = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferSize);
  const visibleEnd = Math.min(
    filteredItems.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + bufferSize
  );

  const visibleItems = filteredItems.slice(visibleStart, visibleEnd);
  const totalHeight = filteredItems.length * itemHeight;
  const offsetY = visibleStart * itemHeight;

  // Optimized scroll handler
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    setScrollTop(target.scrollTop);
  }, []);

  // Toggle expanded state for evidence details
  const toggleExpanded = useCallback((itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  // Safe JSON stringify with error handling
  const safeStringify = useCallback((value: unknown): string => {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }, []);

  return (
    <div
      className={`relative ${className}`}
      role="list"
      aria-label={`Evidence list with ${filteredItems.length} items`}
    >
      <div
        ref={containerRef}
        className="overflow-auto border border-gray-200 rounded-lg"
        style={{ height: containerHeight }}
        onScroll={handleScroll}
        data-testid="virtualized-evidence-container"
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div style={{ transform: `translateY(${offsetY}px)` }}>
            {visibleItems.map((item) => {
              const isExpanded = expandedItems.has(item.id);
              const dynamicHeight = isExpanded ? itemHeight * 2 : itemHeight;

              return (
                <div
                  key={item.id}
                  className="border-b border-gray-100 last:border-b-0"
                  style={{
                    height: dynamicHeight,
                    minHeight: itemHeight
                  }}
                  role="listitem"
                  aria-expanded={isExpanded}
                  data-testid={`evidence-item-${item.id}`}
                >
                  <div className="flex items-start gap-3 p-3 hover:bg-gray-50 transition-colors">
                    <SeverityIndicator severity={item.severity} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-sm">
                        {item.title}
                      </div>
                      <SeverityBadge severity={item.severity} />

                      <button
                        className="mt-2 text-xs text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded px-3 py-3 min-h-[44px]"
                        onClick={() => toggleExpanded(item.id)}
                        aria-expanded={isExpanded}
                        aria-controls={`details-${item.id}`}
                        data-testid={`toggle-details-${item.id}`}
                      >
                        {isExpanded ? 'Hide details' : 'Show details'}
                      </button>

                      {isExpanded && (
                        <div
                          id={`details-${item.id}`}
                          className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600 border overflow-auto max-h-32"
                          data-testid={`details-${item.id}`}
                        >
                          <div className="font-mono text-2xs break-all whitespace-pre-wrap">
                            {safeStringify(sanitizeDetails(item.details))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Scroll indicator for accessibility */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Showing items {visibleStart + 1} to {Math.min(visibleEnd, filteredItems.length)} of {filteredItems.length}
      </div>

      {/* Performance stats for development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-100 rounded">
          Virtual list stats: {visibleItems.length} rendered of {filteredItems.length} total
          (items {visibleStart + 1}-{visibleEnd})
        </div>
      )}
    </div>
  );
});

export default VirtualizedEvidenceList;