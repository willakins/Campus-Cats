import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { useAppTheme } from '@/theme';

import { Button } from '../design';

interface IncrementalHistoryListProps<Item> {
  readonly items: readonly Item[];
  readonly keyExtractor: (item: Item) => string;
  readonly renderItem: (item: Item, index: number) => React.ReactNode;
  readonly resetKey: string;
  readonly batchSize?: number;
  readonly itemName: string;
}

/**
 * Bounds histories nested inside a parent ScrollView, where another
 * VirtualizedList would be unsafe. The newest batch stays visible and older
 * records are progressively prepended on demand.
 */
export const IncrementalHistoryList = <Item,>({
  items,
  keyExtractor,
  renderItem,
  resetKey,
  batchSize = 20,
  itemName,
}: IncrementalHistoryListProps<Item>) => {
  const theme = useAppTheme();
  const [visibleCount, setVisibleCount] = useState(batchSize);

  useEffect(() => setVisibleCount(batchSize), [batchSize, resetKey]);

  const startIndex = Math.max(0, items.length - visibleCount);
  const earlierCount = startIndex;
  const nextCount = Math.min(batchSize, earlierCount);
  const nextLabel = nextCount === 1
    ? itemName.replace(/s$/u, '')
    : itemName;

  return (
    <View style={{ gap: theme.spacing.sm }}>
      {earlierCount > 0 ? (
        <Button
          label={`Show ${nextCount} earlier ${nextLabel}`}
          variant="tertiary"
          onPress={() =>
            setVisibleCount((current) => Math.min(items.length, current + batchSize))
          }
        />
      ) : null}
      {items.slice(startIndex).map((item, offset) => (
        <React.Fragment key={keyExtractor(item)}>
          {renderItem(item, startIndex + offset)}
        </React.Fragment>
      ))}
    </View>
  );
};
