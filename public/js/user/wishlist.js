
    // Navigate to a specific page
   

    async function removeItem(itemId, element) {
      try {
        element.closest('tr').classList.add('loading');
        const response = await fetch('/removeToWishlist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ productId: itemId }),
        });
        if (response.ok) {
          await Swal.fire({
            icon: 'success',
            title: 'Removed!',
            text: 'Item removed from wishlist!',
            timer: 1500,
            showConfirmButton: false,
          });
          element.closest('tr').remove();
        } else {
          await Swal.fire({
            icon: 'error',
            title: 'Failed',
            text: 'Failed to remove item.',
          });
        }
      } catch (err) {
        console.error('Error removing item:', err);
        await Swal.fire({
          icon: 'error',
          title: 'Oops!',
          text: 'An error occurred. Please try again.',
        });
      } finally {
        element.closest('tr').classList.remove('loading');
      }
    }
    
    document.querySelectorAll('.add-to-cart-btn').forEach((button) => {
  button.addEventListener('click', async () => {
    const itemId = button.dataset.itemId;
    const size = button.dataset.size;
    const quantity = 1;
    const flag = 1;

    const query = new URLSearchParams({
      productId: itemId,
      size: size,
      quantity: quantity,
      flag: flag,
    }).toString();

    try {
      // Disable button and show loading state
      button.disabled = true;
      button.classList.add('loading');

      const response = await fetch(`/addToCart?${query}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        await Swal.fire({
          icon: 'success',
          title: 'Added to Cart!',
          text: 'Item successfully moved to your cart.',
          timer: 1500,
          showConfirmButton: false,
        });

        // Only remove row and redirect if successful
        button.closest('tr')?.remove();
        window.location.href = '/wishlist?page=1&limit=4';
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Failed',
          text: data.message || 'Something went wrong.',
        });
      }
    } catch (err) {
      console.error('Error adding item to cart:', err);
      await Swal.fire({
        icon: 'error',
        title: 'Oops!',
        text: 'An error occurred. Please try again.',
      });
    } finally {
      // Re-enable button and remove loading state
      button.disabled = false;
      button.classList.remove('loading');
    }
  });
});

  