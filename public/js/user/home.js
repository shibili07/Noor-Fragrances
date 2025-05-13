

     document.addEventListener("DOMContentLoaded", function() {
        const logoContainer = document.getElementById("logo-container");
        const createSparkles = () => {
          for (let i = 0; i < 15; i++) {
            setTimeout(() => {
              const sparkle = document.createElement("div");
              sparkle.classList.add("sparkle");
              
              // Random position
              const top = Math.random() * 100;
              const left = Math.random() * 100;
              
              sparkle.style.top = `${top}%`;
              sparkle.style.left = `${left}%`;
              
              // Random size
              const size = 4 + Math.random() * 8;
              sparkle.style.width = `${size}px`;
              sparkle.style.height = `${size}px`;
              
              // Random animation duration and delay
              const duration = 0.5 + Math.random() * 1;
              const delay = 2 + Math.random() * 3;
              sparkle.style.animation = `sparkle ${duration}s ease-in-out ${delay}s`;
              
              logoContainer.appendChild(sparkle);
               
              // Remove sparkle after animation
              setTimeout(() => {
                sparkle.remove();
              }, (delay + duration) * 1000);
            }, i * 200);
          }
        };
        
        createSparkles();
        
        // Repeat sparkles periodically
        setInterval(createSparkles, 5000);
      });

document.addEventListener('DOMContentLoaded', function() {
  // For desktop, all cards are visible
  // For mobile, handle pagination
  const isMobile = window.innerWidth <= 768;
  const dots = document.querySelectorAll('.simple-pagination .dot');
  const cards = document.querySelectorAll('.feedback-card-simple');
  
  // Handle dot clicks
  dots.forEach(dot => {
    dot.addEventListener('click', function() {
      const slideIndex = this.getAttribute('data-slide');
      
      // Update active dot
      dots.forEach(d => d.classList.remove('active'));
      this.classList.add('active');
      
      if (isMobile) {
        // On mobile, update active card and scroll to it
        cards.forEach(card => card.classList.remove('active'));
        cards[slideIndex].classList.add('active');
        cards[slideIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } else {
        // On desktop, could add some highlighting effect if desired
        cards.forEach(card => card.classList.remove('active'));
        cards[slideIndex].classList.add('active');
      }
    });
  });
  
  // For mobile devices, handle scroll snap
  if (isMobile) {
    const feedbackRow = document.querySelector('.feedback-row');
    
    // When user scrolls the row, update the active dot
    feedbackRow.addEventListener('scroll', function() {
      const cardWidth = cards[0].offsetWidth + 30; // width + gap
      const scrollPosition = feedbackRow.scrollLeft;
      const activeIndex = Math.round(scrollPosition / cardWidth);
      
      if (activeIndex >= 0 && activeIndex < cards.length) {
        // Update dots
        dots.forEach(d => d.classList.remove('active'));
        dots[activeIndex].classList.add('active');
        
        // Update cards
        cards.forEach(card => card.classList.remove('active'));
        cards[activeIndex].classList.add('active');
      }
    });
  }
  
  // Auto rotation for the slides every 4 seconds
  let currentIndex = 0;
  
  setInterval(() => {
    currentIndex = (currentIndex + 1) % cards.length;
    
    // Update dots
    dots.forEach(d => d.classList.remove('active'));
    dots[currentIndex].classList.add('active');
    
    // Update cards
    cards.forEach(card => card.classList.remove('active'));
    cards[currentIndex].classList.add('active');
    
    // Scroll to the card on mobile
    if (isMobile) {
      cards[currentIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, 4000);
});
