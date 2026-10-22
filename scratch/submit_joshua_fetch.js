const formData = new FormData();
formData.append('applicantName', 'Joshua Aban');
formData.append('applicantEmail', 'abanjoshua72@gmail.com');
formData.append('positionId', 'c7eed4ae-8dea-4557-b1d0-ddc4e7f753ea');
formData.append('positionTitle', '[INTERNAL] Abbott Quota');
formData.append('typing_test_wpm', '28');
formData.append('typing_test_accuracy', '99');
formData.append('typing_test_duration_seconds', '60');
formData.append('phone', '');

fetch('http://localhost:4000/api/applications/public', {
  method: 'POST',
  body: formData
})
.then(res => res.text().then(text => ({status: res.status, text})))
.then(({status, text}) => console.log('Response:', status, text))
.catch(err => console.error('Error:', err));
