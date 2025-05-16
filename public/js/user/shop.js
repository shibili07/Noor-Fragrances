
  document.getElementById("sidebarClearBtn").addEventListener("click", function() {
    document.getElementById("sidebarSearch").value = "";
  });

  document.addEventListener('DOMContentLoaded', function() {
    const filterToggle = document.getElementById('filterToggle');
    const sidebarWrapper = document.getElementById('sidebarWrapper');

    filterToggle.addEventListener('click', function() {
      sidebarWrapper.classList.toggle('show');
      filterToggle.innerHTML = sidebarWrapper.classList.contains('show') ?
        '<i class="fas fa-times"></i> Hide Filters' :
        '<i class="fas fa-filter"></i> Show Filters';
    });

    const wishlistIcons = document.querySelectorAll('.wishlist-icon');
    wishlistIcons.forEach(icon => {
      icon.addEventListener('click', () => {
        const heart = icon.querySelector('i');
        heart.classList.toggle('far');
        heart.classList.toggle('fas');
        heart.style.color = heart.classList.contains('fas') ? '#ff586e' : '#555';
      });
    });

    if (window.innerWidth < 992) {
      sidebarWrapper.classList.remove('show');
    } else {
      sidebarWrapper.classutungList.add('show');
    }

    filterToggle.addEventListener('click', function() {
      sidebarWrapper.classList.add('user-toggled');
    });

    window.addEventListener('resize', function() {
      if (window.innerWidth >= 992) {
        sidebarWrapper.classList.add('show');
      } else if (!sidebarWrapper.classList.contains('user-toggled')) {
        sidebarWrapper.classList.remove('show');
      }
    });
  });

  document.querySelectorAll('.add-to-cart-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      const itemId = button.dataset.itemId;
      const size = button.dataset.size;
      const quantity = 1;
     
      const query = new URLSearchParams({
        productId: itemId,
        size: size,
        quantity: quantity,
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

  window.addToWishlist = async function (productId, sku) {
    try {
      const response = await fetch(`/addToWishlist/${productId}/${sku}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.success) {
        Swal.fire({
          icon: "success",
          title: "Added to Wishlist!",
          showConfirmButton: false,
          timer: 1500
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Failed",
          text: data.message || "Could not add to wishlist.",
        });
      }
    } catch (error) {
      console.error("Error adding to wishlist:", error);
      Swal.fire({
        icon: "error",
        title: "Not Logged In",
        text: "You must be logged in to add items to the wishlist.",
      });
    }
  };
