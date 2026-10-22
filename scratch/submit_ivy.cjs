const axios = require('axios');

const payload = {
  applicant_id: 'app_' + Date.now(),
  applicant_name: 'Ivy Joy Tampos',
  applicant_email: 'ivy.tampos@example.com',
  position: { id: 1, title: 'Inbound Patient Support' },
  typing_test_passed: false,
  pis: {
      full_name: 'Ivy Joy Tampos',
      first_name: 'Ivy Joy',
      last_name: 'Tampos',
      email: 'ivy.tampos@example.com',
      phone: '09123456789'
  },
  typing_test: { wpm: 23, accuracy: 92, duration: 60 }
};

axios.post('http://localhost:3000/api/applications/submit', payload)
  .then(res => console.log('Success:', res.data))
  .catch(err => console.error('Error:', err.response ? err.response.data : err.message));
