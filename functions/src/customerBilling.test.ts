import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  activityOperationAllowed,
  customerHasRequiredBillingDetails,
  endOfFirstLocalDay,
  invoiceIsAtLeastAsRecent,
  invoiceNeedsCollection,
  localMonthPeriod,
  meteredMediaPath,
  nextLocalMonthStart,
  previousLocalMonthPeriod,
} from './customerBilling';

describe('customer billing calendar and usage policy', () => {
  it('allows every specified activity workflow and excludes non-billable writes', () => {
    const allowed = [
      ['cat-sightings', 'create'],
      ['cat-sightings', 'update'],
      ['cat-sightings', 'delete'],
      ['catalog', 'create'],
      ['catalog', 'update'],
      ['catalog', 'delete'],
      ['announcements', 'create'],
      ['announcements', 'update'],
      ['announcements', 'delete'],
      ['community-events', 'create'],
      ['community-events', 'update'],
      ['community-events', 'delete'],
      ['stations', 'create'],
      ['stations', 'update'],
      ['stations', 'delete'],
      ['community-surveys', 'create'],
      ['community-surveys', 'update'],
      ['survey-responses', 'create'],
      ['community-votes', 'create'],
      ['community-vote-nominees', 'create'],
      ['community-vote-ballots', 'create'],
    ] as const;
    for (const [collection, operation] of allowed) {
      assert.equal(activityOperationAllowed(collection, operation), true);
    }
    for (const collection of [
      'users',
      'public-profiles',
      'catalog-favorites',
      'catalog-tag-settings',
      'catalog-tag-assignments',
      'contact-info',
      'whitelist',
      'app-settings',
      'billing-usage',
      'inaturalist-observations',
    ]) {
      for (const operation of ['create', 'update', 'delete'] as const) {
        assert.equal(activityOperationAllowed(collection, operation), false);
      }
    }
    assert.equal(activityOperationAllowed('community-surveys', 'delete'), false);
    assert.equal(activityOperationAllowed('survey-responses', 'update'), false);
  });

  it('meters exact media bytes only for allowlisted club content paths', () => {
    assert.deepEqual(
      meteredMediaPath('clubs/alpha/cat-sightings/sighting-1/photo.jpg'),
      { clubId: 'alpha', collection: 'cat-sightings' },
    );
    assert.deepEqual(
      meteredMediaPath('clubs/alpha/community-votes/vote-1/option.jpg'),
      { clubId: 'alpha', collection: 'community-votes' },
    );
    assert.equal(
      meteredMediaPath('clubs/alpha/public-profiles/member-1/photo.jpg'),
      undefined,
    );
    assert.equal(meteredMediaPath('cat-sightings/sighting-1/photo.jpg'), undefined);
  });

  it('uses local calendar months across a leap year and daylight-saving change', () => {
    const february = localMonthPeriod(
      new Date('2024-02-15T18:00:00.000Z'),
      'America/New_York',
    );
    assert.equal(february.key, '2024-02');
    assert.equal(february.startsAt.toISOString(), '2024-02-01T05:00:00.000Z');
    assert.equal(february.endsAt.toISOString(), '2024-03-01T05:00:00.000Z');

    const march = localMonthPeriod(
      new Date('2024-03-15T18:00:00.000Z'),
      'America/New_York',
    );
    assert.equal(march.startsAt.toISOString(), '2024-03-01T05:00:00.000Z');
    assert.equal(march.endsAt.toISOString(), '2024-04-01T04:00:00.000Z');
  });

  it('sets first-day invoice and next-month grace deadlines in club time', () => {
    assert.equal(
      endOfFirstLocalDay(
        new Date('2026-11-01T05:00:00.000Z'),
        'America/New_York',
      ).toISOString(),
      '2026-11-02T04:59:59.999Z',
    );
    assert.equal(
      nextLocalMonthStart(
        new Date('2026-12-15T12:00:00.000Z'),
        'America/New_York',
      ).toISOString(),
      '2027-01-01T05:00:00.000Z',
    );
    assert.equal(
      previousLocalMonthPeriod(
        new Date('2026-11-01T05:00:00.000Z'),
        'America/New_York',
      ).key,
      '2026-10',
    );
  });

  it('does not re-open entitlement deadlines for a paid or closed invoice', () => {
    assert.equal(invoiceNeedsCollection({ status: 'open', amount_remaining: 500 }), true);
    assert.equal(invoiceNeedsCollection({ status: 'paid', amount_remaining: 0 }), false);
    assert.equal(invoiceNeedsCollection({ status: 'void', amount_remaining: 500 }), false);
    assert.equal(invoiceIsAtLeastAsRecent({ created: 20 }, { created: 10 }), true);
    assert.equal(invoiceIsAtLeastAsRecent({ created: 10 }, { created: 20 }), false);
  });

  it('requires complete hosted billing details without requiring a saved card', () => {
    assert.equal(
      customerHasRequiredBillingDetails({
        name: 'Campus Cats',
        email: 'billing@example.com',
        address: {
          line1: '1 Cat Way',
          line2: null,
          city: 'Atlanta',
          state: 'GA',
          postal_code: '30332',
          country: 'US',
        },
      }),
      true,
    );
    assert.equal(
      customerHasRequiredBillingDetails({
        name: 'Campus Cats',
        email: 'billing@example.com',
        address: null,
      }),
      false,
    );
  });
});
