import { completeWithDomainFilteredSearch } from './openai-responses.js';

const history = [
  { role: 'system', content: 'You are a helpful assistant. Cite sources when you use web_search.' },
  { role: 'user', content: 'When is the add/drop deadline for Fall 2026?' }
];

completeWithDomainFilteredSearch(history)
  .then(answer => console.log(answer))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
