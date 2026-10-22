import axios from 'axios';
import FormData from 'form-data';

const form = new FormData();
form.append('applicant_id', 'app_' + Date.now());
form.append('applicant_name', 'Ivy Joy Tampos');
form.append('applicant_email', 'ivy.tampos@example.com');
form.append('position', JSON.stringify({ id: 1, title: 'Inbound Patient Support' }));
form.append('typing_test_passed', 'false');
form.append('pis', JSON.stringify({
    full_name: 'Ivy Joy Tampos',
    first_name: 'Ivy Joy',
    last_name: 'Tampos',
    email: 'ivy.tampos@example.com',
    phone: '09123456789'
}));
form.append('typing_test', JSON.stringify({ wpm: 23, accuracy: 92, duration: 60 }));

axios.post('http://localhost:4000/api/applications/public', form, {
    headers: form.getHeaders()
})
  .then(res => console.log('Success:', res.data))
  .catch(err => console.error('Error:', err.response ? JSON.stringify(err.response.data, null, 2) : err.message));
