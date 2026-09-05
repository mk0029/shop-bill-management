const { createClient } = require('@sanity/client');
require('dotenv').config();
const billing = createClient({
  projectId: '0p2q6c95', dataset: 'production', useCdn: false, apiVersion: '2024-01-01',
  token: process.env.SANITY_DB_BILLING_TOKEN,
});
(async () => {
  const [bills, drafts, cb, tle, at, sample] = await Promise.all([
    billing.fetch(`count(*[_type=="bill"])`),
    billing.fetch(`count(*[_type=="bill" && _id in path("drafts.**")])`),
    billing.fetch(`count(*[_type=="cashBookEntry"])`),
    billing.fetch(`count(*[_type=="billTimelineEvent"])`),
    billing.fetch(`count(*[_type=="advanceTransaction"])`),
    billing.fetch(`*[_type=="bill"][0...3]{_id,_createdAt,_updatedAt,billNumber,totalAmount,paymentStatus}`),
  ]);
  console.log(JSON.stringify({ billsTotal: bills, billDrafts: drafts, cashBookEntry: cb, billTimelineEvent: tle, advanceTransaction: at }, null, 2));
  console.log('sample bills:', JSON.stringify(sample, null, 2));
})().catch(e => { console.error(e.message); process.exit(1); });
