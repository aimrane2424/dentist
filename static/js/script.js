// Menu mobile
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // Fermer le menu quand on clique sur un lien
    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });
}

// Validation du formulaire de rendez-vous
const appointmentForm = document.getElementById('appointmentForm');
if (appointmentForm) {
    appointmentForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Validation simple
        let isValid = true;
        const requiredFields = appointmentForm.querySelectorAll('[required]');
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                isValid = false;
                field.style.borderColor = '#f44336';
            } else {
                field.style.borderColor = '#ddd';
            }
        });
        
        // Validation de l'email
        const emailField = document.getElementById('email');
        if (emailField && emailField.value) {
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(emailField.value)) {
                isValid = false;
                emailField.style.borderColor = '#f44336';
                alert('Veuillez saisir une adresse email valide.');
            }
        }
        
        // Validation de la date (au moins aujourd'hui)
        const dateField = document.getElementById('date');
        if (dateField && dateField.value) {
            const selectedDate = new Date(dateField.value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (selectedDate < today) {
                isValid = false;
                dateField.style.borderColor = '#f44336';
                alert('Veuillez sélectionner une date future ou aujourd\'hui.');
            }
        }
        
        if (isValid) {
            // Envoyer le formulaire
            this.submit();
        } else {
            alert('Veuillez remplir tous les champs obligatoires correctement.');
        }
    });
}

// Initialisation des sélecteurs de date et heure
document.addEventListener('DOMContentLoaded', function() {
    // Configurer le champ date pour n'accepter que les dates futures
    const dateInput = document.getElementById('date');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.setAttribute('min', today);
    }
    
    // Générer les options d'heures
    const timeSelect = document.getElementById('time');
    if (timeSelect) {
        // Heures d'ouverture: 8h30 à 18h30
        const startHour = 8;
        const endHour = 18;
        
        for (let hour = startHour; hour <= endHour; hour++) {
            // Ajouter les heures pleines et les demi-heures
            for (let minute = 0; minute < 60; minute += 30) {
                // Sauter l'heure de déjeuner (12h30-14h)
                if (hour === 12 && minute === 30) continue;
                if (hour === 13 && minute === 0) continue;
                if (hour === 13 && minute === 30) continue;
                
                // Format HH:MM
                const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                const option = document.createElement('option');
                option.value = timeString;
                option.textContent = timeString;
                timeSelect.appendChild(option);
            }
        }
    }
    
    // Animation des cartes au défilement
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
            }
        });
    }, observerOptions);
    
    // Observer les cartes de services, dentistes et témoignages
    document.querySelectorAll('.feature-card, .service-preview, .dentist-card, .testimonial-card').forEach(card => {
        observer.observe(card);
    });
});
// Ajouter à la fin du fichier script.js existant

// Gestion du formulaire de contact
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        let isValid = true;
        const requiredFields = contactForm.querySelectorAll('[required]');
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                isValid = false;
                field.style.borderColor = '#f44336';
            } else {
                field.style.borderColor = '#ddd';
            }
        });
        
        // Validation email
        const emailField = contactForm.querySelector('input[type="email"]');
        if (emailField && emailField.value) {
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(emailField.value)) {
                isValid = false;
                emailField.style.borderColor = '#f44336';
            }
        }
        
        if (isValid) {
            // Afficher message de confirmation
            const successMessage = document.createElement('div');
            successMessage.className = 'success-message';
            successMessage.innerHTML = `
                <div style="background-color: #d4edda; color: #155724; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <i class="fas fa-check-circle"></i>
                    <strong>Message envoyé !</strong> Nous vous répondrons dans les plus brefs délais.
                </div>
            `;
            
            contactForm.insertBefore(successMessage, contactForm.firstChild);
            
            // Réinitialiser le formulaire après 3 secondes
            setTimeout(() => {
                contactForm.reset();
                successMessage.remove();
            }, 5000);
        } else {
            alert('Veuillez remplir tous les champs obligatoires correctement.');
        }
    });
}

// Gestion des paramètres d'URL pour pré-remplir le formulaire de RDV
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// Si on est sur la page de rendez-vous, pré-remplir avec les paramètres d'URL
if (window.location.pathname.includes('appointment')) {
    document.addEventListener('DOMContentLoaded', function() {
        const service = getUrlParameter('service');
        const dentist = getUrlParameter('dentist');
        
        if (service && document.getElementById('service')) {
            document.getElementById('service').value = service;
        }
        
        if (dentist && document.getElementById('dentist')) {
            document.getElementById('dentist').value = dentist;
        }
    });
}

// Générer les heures de rendez-vous
function generateTimeSlots() {
    const timeSelect = document.getElementById('time');
    if (!timeSelect) return;
    
    // Heures d'ouverture
    const startHour = 8;
    const endHour = 18;
    
    // Vider les options existantes (sauf la première)
    while (timeSelect.options.length > 1) {
        timeSelect.remove(1);
    }
    
    // Générer les créneaux
    for (let hour = startHour; hour <= endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
            // Sauter la pause déjeuner (12h30-14h)
            if (hour === 12 && minute === 30) continue;
            if (hour === 13 && minute === 0) continue;
            if (hour === 13 && minute === 30) continue;
            
            const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            const option = document.createElement('option');
            option.value = timeString;
            option.textContent = timeString;
            timeSelect.appendChild(option);
        }
    }
}

// Initialiser les créneaux horaires
document.addEventListener('DOMContentLoaded', generateTimeSlots);

// Animation au défilement
function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('.feature-card, .service-preview, .dentist-card, .testimonial-card, .value-card');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });
    
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(el);
    });
}

document.addEventListener('DOMContentLoaded', initScrollAnimations);