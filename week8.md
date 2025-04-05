<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NOOR Fragrance</title>
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Font Awesome for icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <!-- Import Akshar font -->
    <link href="https://fonts.googleapis.com/css2?family=Akshar:wght@400;600&display=swap" rel="stylesheet">
    <style>
        /* Custom styles */
        .navbar-brand {
            font-size: 2rem;
            font-weight: bold;
            letter-spacing: 2px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .navbar-brand img {
            max-height: 40px;
            width: auto;
        }
        
        .nav-link {
            margin: 0 15px;
            font-family: 'Akshar', sans-serif;
            font-weight: 400;
            font-size: 1.1rem;
            color: #807D7E;
            transition: all 0.3s ease;
            position: relative;
            padding-bottom: 5px;
        }
        
        .nav-link:hover {
            color: #000;
            text-decoration: none;
        }
        
        /* Style for active items - font size 22px, semi-bold, black */
        .nav-item.active .nav-link {
            font-weight: 600;
            font-size: 22px;
            color: #000;
        }
        
        /* Custom hamburger menu styles */
        .hamburger-label {
            display: flex;
            flex-direction: column;
            width: 37px;
            cursor: pointer;
            display: none;
            padding: 2px 0;
            border: none;
            outline: none;
            box-shadow: none;
        }
        
        /* Remove navbar-toggler default border and styles */
        .navbar-toggler {
            border: none;
            padding: 0;
            outline: none !important;
            box-shadow: none !important;
        }
        
        .hamburger-label span {
            background: #000000;
            border-radius: 10px;
            height: 4px;
            margin: 4px 0;
            transition: .4s cubic-bezier(0.68, -0.6, 0.32, 1.6);
        }
        
        .hamburger-label span:nth-of-type(1) {
            width: 50%;
        }
        
        .hamburger-label span:nth-of-type(2) {
            width: 100%;
        }
        
        .hamburger-label span:nth-of-type(3) {
            width: 75%;
        }
        
        .hamburger-input {
            display: none;
        }
        
        .hamburger-input:checked ~ span:nth-of-type(1) {
            transform-origin: bottom;
            transform: rotatez(45deg) translate(5px, 0px);
        }
        
        .hamburger-input:checked ~ span:nth-of-type(2) {
            transform-origin: top;
            transform: rotatez(-45deg);
        }
        
        .hamburger-input:checked ~ span:nth-of-type(3) {
            transform-origin: bottom;
            width: 50%;
            transform: translate(20px, -8px) rotatez(45deg);
        }
        
        .search-container {
            position: relative;
            background-color: #f5f5f5;
            border-radius: 25px;
            padding: 5px 15px;
            margin-bottom: 15px;
            width: 100%;
            max-width: 300px;
        }
        
        .search-container input {
            border: none;
            background-color: transparent;
            padding-left: 30px;
            width: 100%;
        }
        
        .search-container input:focus {
            outline: none;
        }
        
        .search-icon {
            position: absolute;
            left: 15px;
            top: 50%;
            transform: translateY(-50%);
            color: #777;
        }
        
        .navbar-icons {
            display: flex;
            align-items: center;
        }
        
        .navbar-icons a {
            margin: 0 8px;
            color: #555;
            transition: all 0.3s ease;
            text-decoration: none;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .navbar-icons a i {
            font-size: 1.1rem;
            padding: 8px;
        }
        
        .navbar-icons a:hover {
            color: #000;
            transform: scale(1.1);
            text-decoration: none;
        }
        
        /* Added styles for active state with pink background and white icon */
        .navbar-icons a.active {
            background-color: #FD334E;
            color: white;
            border-radius: 8px;
            text-decoration: none;
        }
        
        /* Login button with small gap */
        .btn-outline-secondary {
            margin-left: 10px;
            padding: 5px 15px;
            font-size: 0.9rem;
        }
        
        /* Desktop layout for navbar-icons (visible at the top right) */
        .navbar-icons-desktop {
            display: flex;
            margin-left: auto;
        }
        
        /* Mobile layout for navbar-icons (inside collapse) */
        .navbar-icons-mobile {
            display: none;
            justify-content: center;
            margin-top: 15px;
            width: 100%;
        }

        /* Center menu items properly */
        .navbar-nav {
            margin: 0 auto;
        }
        
        @media (max-width: 991px) {
            .navbar-brand {
                text-align: center;
                margin: 0 auto;
            }
            
            /* Show hamburger menu on smaller screens */
            .hamburger-label {
                display: flex;
            }
            
            /* Hide desktop icons */
            .navbar-icons-desktop {
                display: none;
            }
            
            /* Show mobile icons */
            .navbar-icons-mobile {
                display: flex;
            }
            
            .search-container {
                margin: 15px auto;
                max-width: 90%;
            }
            
            .navbar-icons a {
                margin: 0 10px;
            }
            
            .navbar-icons a i {
                font-size: 1.2rem;
                padding: 8px;
            }
            
            .btn-outline-secondary {
                padding: 4px 10px;
                font-size: 0.9rem;
                margin-left: 15px;
            }
            
            /* Responsive text size adjustments for nav items */
            .nav-link {
                font-size: 1rem;
                margin: 0 10px;
            }
            
            .nav-item.active .nav-link {
                font-size: 1.2rem;
            }
        }
        
        /* Additional media query for very small screens */
        @media (max-width: 576px) {
            .nav-link {
                font-size: 0.9rem;
                margin: 0 5px;
            }
            
            .nav-item.active .nav-link {
                font-size: 1.1rem;
            }
            
            .navbar-icons a {
                margin: 0 5px;
            }
            
            .navbar-icons a i {
                font-size: 1rem;
                padding: 6px;
            }
            
            .btn-outline-secondary {
                padding: 3px 8px;
                font-size: 0.8rem;
                margin-left: 8px;
            }
        }
        .dropdown{
            position: relative;
            display: inline-block;

        }
        .dropdown-content{
            display: none;
            position: absolute;
            background-color: white;
            min-width: 160px;
            box-shadow:black;
            z-index: 1000;
            right: 0;      

        }
        .dropdown-content a{
            color: black;
            padding: 12px 16px;
            text-decoration: none;
            display: block;
            width: 100%;
        }
        .dropdown-content a:hover{
            background-color: #f1f1f1;

        }

        .dropdown:hover .dropdown-content{
            display: block;

        }
        .header{
            position: relative;
            z-index: 500;
        }
        /* Added an extra breakpoint for extra small devices */
        @media (max-width: 375px) {
            .nav-link {
                font-size: 0.85rem;
                margin: 0 3px;
            }
            
            .nav-item.active .nav-link {
                font-size: 1rem;
            }
            
            .navbar-brand img {
                max-height: 35px;
            }
            
            .navbar-icons a i {
                font-size: 0.9rem;
                padding: 5px;
            }
        }
    </style>
</head>
<body>

<nav class="navbar navbar-expand-lg navbar-light bg-white py-3">
    <div class="container-fluid">
        <!-- Custom Hamburger Toggle Button -->
        <label for="menu-toggle" class="hamburger-label navbar-toggler">
            <input type="checkbox" id="menu-toggle" class="hamburger-input" data-bs-toggle="collapse" data-bs-target="#navbarContent" 
                   aria-controls="navbarContent" aria-expanded="false" aria-label="Toggle navigation">
            <span></span>
            <span></span>
            <span></span>
        </label>
        
        <!-- Brand (centered) with logo -->
        <a class="navbar-brand mx-auto order-0" href="#">
            <img src="/img/logo/image.png" alt="NOOR">
        </a>
       
        <!-- Desktop icons (visible only on desktop) -->
        <div class="navbar-icons navbar-icons-desktop order-lg-2">
            <a href="#" aria-label="Wishlist" class="icon-link" data-icon="wishlist">
                <i class="far fa-heart"></i>
            </a>
            <a href="#" aria-label="Account" class="icon-link" data-icon="account">
                <i class="far fa-user"></i>
            </a>
            <a href="#" aria-label="Cart" class="icon-link" data-icon="cart">
                <i class="fas fa-shopping-cart"></i>
            </a>
            <a  href="/login" type="button" class="btn btn-outline-secondary">login</a>
        </div>
        
        <!-- Collapsible Content -->
        <div class="collapse navbar-collapse order-lg-1" id="navbarContent">
            <!-- Navigation Links -->
            <ul class="navbar-nav">
                <li class="nav-item">
                    <a class="nav-link" href="#" data-page="home">Home</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#" data-page="shop">Shop</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#" data-page="blogs">Blogs</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#" data-page="about">About</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#" data-page="contact">Contact</a>
                </li>
            </ul>
            
            <!-- Search Bar -->
            <div class="search-container mx-auto">
                <span class="search-icon">
                    <i class="fas fa-search"></i>
                </span>
                <input type="text" placeholder="Search" aria-label="Search">
            </div>
            
            <!-- Mobile icons (visible only on mobile within collapse) -->
            <div class="navbar-icons navbar-icons-mobile">
                <a href="#" aria-label="Wishlist" class="icon-link" data-icon="wishlist">
                    <i class="far fa-heart"></i>
                </a>
                <a href="#" aria-label="Cart" class="icon-link" data-icon="cart">
                    <i class="fas fa-shopping-cart"></i>
                </a>
                <%if(locals.user){%>
                    <div class ="dropdown">
                        <a href="#" aria-label="Account" class="icon-link" data-icon="account">
                            <i class="far fa-user"></i>
                        </a>
                        <div class="dropdown-content">
                            <a href="/userProfile">Profile</a>
                            <a href="/logout">Logout</a>
                        </div>

                    </div>
                <%}else{%>
                     
                <a  href="/login" type="button" class="btn 
                btn-outline-secondary">login</a>
                <%}%>
            </div>
        </div> 
    </div>
</nav>

<!-- Bootstrap JS Bundle with Popper -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

<!-- Custom JavaScript for navbar active state -->
<script>
    document.addEventListener('DOMContentLoaded', function() {
        // Get the current page from URL or set default to 'home'
        let currentPage = window.location.pathname.split('/').pop().replace('.html', '') || 'home';
        
        // If the URL has no specific page, default to home
        if(currentPage === '' || currentPage === '/') {
            currentPage = 'home';
        }
        
        // Set the initial active class based on the current page
        setActiveNavItem(currentPage);
        
        // Add click event listeners to each nav item
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                // Prevent default link behavior if you're handling navigation with JS
                e.preventDefault();
                
                // Remove active class from all nav items
                document.querySelectorAll('.nav-item').forEach(item => {
                    item.classList.remove('active');
                });
                
                // Add active class to clicked nav item's parent
                this.parentElement.classList.add('active');
                
                // Get the page identifier from data attribute
                const page = this.getAttribute('data-page');
                
                // Here you would typically navigate to the page
                // You can uncomment this if you want actual navigation
                // window.location.href = page + '.html';
                
                // For demo purposes, just log the navigation
                console.log('Navigating to:', page);
            });
        });
        
        // Add click event listeners to all icon links (both mobile and desktop)
        const iconLinks = document.querySelectorAll('.icon-link');
        iconLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                // Prevent default link behavior
                e.preventDefault();
                
                // Get the icon identifier from data attribute
                const iconType = this.getAttribute('data-icon');
                
                // Find all matching icons with the same data-icon attribute
                const matchingIcons = document.querySelectorAll(`.icon-link[data-icon="${iconType}"]`);
                
                // Toggle active class across all matching icons
                if (this.classList.contains('active')) {
                    matchingIcons.forEach(icon => {
                        icon.classList.remove('active');
                    });
                } else {
                    // Remove active class from all icon links
                    document.querySelectorAll('.icon-link').forEach(item => {
                        item.classList.remove('active');
                    });
                    
                    // Add active class to all matching icons
                    matchingIcons.forEach(icon => {
                        icon.classList.add('active');
                    });
                }
                
                // For demo purposes, just log the icon click
                console.log('Clicked icon:', iconType);
            });
        });
        
        // Function to set the active nav item based on page name
        function setActiveNavItem(pageName) {
            // Remove active class from all items
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // Find the link with matching data-page attribute and set its parent as active
            const activeLink = document.querySelector(`.nav-link[data-page="${pageName}"]`);
            if (activeLink) {
                activeLink.parentElement.classList.add('active');
            }
        }
        
        // Handle toggle state on menu open/close
        document.getElementById('navbarContent').addEventListener('shown.bs.collapse', function() {
            document.getElementById('menu-toggle').checked = true;
        });
        
        document.getElementById('navbarContent').addEventListener('hidden.bs.collapse', function() {
            document.getElementById('menu-toggle').checked = false;
        });
    });
</script>
</body>
</html>