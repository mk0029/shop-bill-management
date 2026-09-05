const { createClient } = require('@sanity/client');
require('dotenv').config();
const dbs = {
  billing:    { id: '0p2q6c95', d: 'production', t: 'SANITY_DB_BILLING_TOKEN' },
  inventory:  { id: 'szpnig3h', d: 'production', t: 'SANITY_DB_INVENTORY_TOKEN' },
  overflow:   { id: 'cqn8y58w', d: 'production', t: 'SANITY_DB_OVERFLOW_TOKEN' },
  public:     { id: 'oojkmj55', d: 'production', t: 'SANITY_DB_PUBLIC_TOKEN' },
  archive:    { id: 'ugyo6tiv', d: 'production', t: 'SANITY_DB_ARCHIVE_TOKEN' },
  customers:  { id: 'wpzry5rh', d: 'production', t: 'SANITY_DB_CUSTOMERS_TOKEN' },
  catalog:    { id: 'skuz6fmi', d: 'production', t: 'SANITY_DB_CATALOG_TOKEN' },
  offers:     { id: 'qhqpjfi0', d: 'production', t: 'SANITY_DB_OFFERS_TOKEN' },
  operations: { id: '47epy611', d: 'production', t: 'SANITY_DB_OPERATIONS_TOKEN' },
  comms:      { id: 'f9m0s3a9', d: 'production', t: 'SANITY_DB_COMMS_TOKEN' },
  rentals:    { id: '46od0fcp', d: 'production', t: 'SANITY_DB_RENTALS_TOKEN' },
};
(async () => {
  for (const [name, cfg] of Object.entries(dbs)) {
    try {
      const client = createClient({ projectId: cfg.id, dataset: cfg.d, useCdn: false, apiVersion: '2024-01-01', token: process.env[cfg.t] });
      const [bills, cb, tle, at] = await Promise.all([
        client.fetch(`count(*[_type=="bill"])`),
        client.fetch(`count(*[_type=="cashBookEntry"])`),
        client.fetch(`count(*[_type=="billTimelineEvent"])`),
        client.fetch(`count(*[_type=="advanceTransaction"])`),
      ]);
      console.log(`${name.padEnd(10)} bills=${bills} cashBookEntry=${cb} billTimelineEvent=${tle} advanceTransaction=${at}`);
    } catch (e) {
      console.log(`${name.padEnd(10)} ERROR: ${e.message}`);
    }
  }
})().catch(e => { console.error(e.message); process.exit(1); });
