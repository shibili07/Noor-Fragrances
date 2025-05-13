
        // Animate the envelope icon with a subtle floating effect
        document.addEventListener('DOMContentLoaded', function() {
            // Create and animate additional flying envelopes after a delay
            setTimeout(() => {
                for (let i = 0; i < 5; i++) {
                    createFlyingEnvelope();
                }
            }, 2000);
        });
        
        function createFlyingEnvelope() {
            const envelope = document.createElement('div');
            envelope.className = 'email-flight';
            
            // Random position and animation delay
            const left = Math.random() * 80 + 10; // 10% to 90%
            const delay = Math.random() * 2;
            
            envelope.style.left = `${left}%`;
            envelope.style.top = '70%';
            envelope.style.animationDelay = `${delay}s`;
            
            // Add envelope icon
            const icon = document.createElement('i');
            icon.className = 'fas fa-envelope';
            envelope.appendChild(icon);
            
            // Add to container
            document.querySelector('.container').appendChild(envelope);
            
            // Remove from DOM after animation completes
            setTimeout(() => {
                envelope.remove();
            }, 3000 + (delay * 1000));
        }
