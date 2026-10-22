const formData = new FormData();
formData.append('applicantName', 'Ivy Joy Tampos');
formData.append('applicantEmail', 'ivy.tampos@example.com');
formData.append('positionId', 'c7eed4ae-8dea-4557-b1d0-ddc4e7f753ea');
formData.append('positionTitle', '[INTERNAL] Abbott Quota');
formData.append('typing_test_wpm', '23');
formData.append('typing_test_accuracy', '92');
formData.append('typing_test_duration_seconds', '60');
formData.append('phone', '09123456789');

fetch('http://localhost:4000/api/applications/public', {
  method: 'POST',
  body: formData
})
.then(res => res.text().then(text => ({status: res.status, text})))
.then(({status, text}) => console.log('Response:', status, text))
.catch(err => console.error('Error:', err));
