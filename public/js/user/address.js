
  // Add this JavaScript to make the address type buttons functional
  document.addEventListener('DOMContentLoaded', function() {
    // Get all address type button groups
    const addressTypeGroups = document.querySelectorAll('.address-type-container');
    
    // For each group, add click listeners
    addressTypeGroups.forEach(group => {
      const buttons = group.querySelectorAll('.address-type-btn');
      
      buttons.forEach(button => {
        button.addEventListener('click', function() {
          // Remove active class from all buttons in this group
          buttons.forEach(btn => btn.classList.remove('active'));
          
          // Add active class to clicked button
          this.classList.add('active');
        });
      });
    });
    
    
  });
  

  document.addEventListener('DOMContentLoaded', function() {
    const notyf = new Notyf({
      duration: 3000,
      position: {
        x: 'right',
        y: 'bottom',
      },
      types: [  
        {
          type: 'success',
          background: '#28a745',
          icon: {
            className: 'fas fa-check',
            tagName: 'i',
            color: 'white'
          }
        },
        {
          type: 'error',
          background: '#dc3545',
          icon: {
            className: 'fas fa-times',
            tagName: 'i',
            color: 'white'
          }
        }
      ]
    });

    const defaultButtons = document.querySelectorAll('.set-default-btn');
    
    defaultButtons.forEach(button => {
      button.addEventListener('click', function() {
        const addressId = this.getAttribute('data-id');
        
        // Simulate backend call (replace with actual fetch/AJAX later)
        fetch(`/set-default-address?id=${addressId}`, {
          method: 'GET',
        })
        .then(response => {
          if (response.ok) {
            notyf.success('Default address updated!');
            setTimeout(() => {
              window.location.reload(); // reload to reflect changes
            },1000);
          } else {
            notyf.error('Failed to set default address.');
          }
        })
        .catch(() => {
          notyf.error('Something went wrong.');
        });
      });
    });
  });


  document.querySelectorAll('.delete-btn').forEach(button => {
  button.addEventListener('click', async () => {
    const id = button.dataset.id;

    const confirm = await Swal.fire({
      title: 'Are you sure?',
      text: 'You will not be able to recover this address!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });

    if (confirm.isConfirmed) {
      try {
        const response = await fetch(`/deleteAddress/${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          Swal.fire('Deleted!', 'The address has been deleted.', 'success')
            .then(() => {
              // Reload the page or remove the item from DOM
              location.reload();
            });
        } else {
          const data = await response.json();
          Swal.fire('Error', data.message || 'Something went wrong.', 'error');
        }
      } catch (err) {
        Swal.fire('Error', err.message || 'Request failed.', 'error');
      }
    }
  });
});


