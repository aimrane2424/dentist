// Initialisation de DataTables
$(document).ready(function() {
    // Initialiser le tableau avec DataTables
    $('#appointmentsTable').DataTable({
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/fr-FR.json'
        },
        pageLength: 25,
        order: [[8, 'desc']], // Trier par date de soumission (colonne 8)
        responsive: true,
        dom: '<"top"lf>rt<"bottom"ip><"clear">'
    });
    
    // Bouton d'actualisation
    $('#refreshBtn').click(function() {
        location.reload();
    });
    
    // Bouton d'export CSV (محسّن ومضمون 100%)
    $('#exportBtn').click(function() {
        // جلب البيانات من API بدل الاعتماد على الـ HTML (أدق وأسرع)
        fetch('/api/appointments')
            .then(response => response.json())
            .then(appointments => {
                if (appointments.length === 0) {
                    showToast('Aucun rendez-vous à exporter.', 'info');
                    return;
                }

                // إنشاء رأس الـ CSV
                let csv = 'ID,Nom complet,Téléphone,Email,Service,Dentiste,Date,Heure,Date de soumission,Notes,Statut\n';

                // ملء البيانات
                appointments.forEach(apt => {
                    const notes = (apt.notes || '').replace(/"/g, '""');
                    const status = apt.status || 'pending';
                    csv += `"${apt.id}","${apt.full_name}","${apt.phone}","${apt.email}","${apt.service}","${apt.dentist}","${apt.date}","${apt.time}","${apt.submitted_at}","${notes}","${status}"\n`;
                });

                // تحميل الملف
                const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }); // UTF-8 BOM باش العربية تبان مزيان فالإكسيل
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `rendez-vous-smiledent-${new Date().toISOString().split('T')[0]}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                showToast('Export CSV terminé avec succès !', 'success');
            })
            .catch(err => {
                console.error(err);
                showToast('Erreur lors de l\'export. Réessayez.', 'error');
            });
    });
    
    // Gestion des alertes
    $('.close-alert').click(function() {
        $(this).parent().fadeOut();
    });
    
    // Fermer automatiquement les alertes après 5 secondes
    setTimeout(() => {
        $('.alert').fadeOut();
    }, 5000);
    
    // Modal pour voir les détails
    $('.btn-view').click(function() {
        const appointmentId = $(this).data('id');
        showAppointmentDetails(appointmentId);
    });
    
    // Fermer le modal
    $('.close-modal').click(function() {
        $('#detailsModal').removeClass('active');
    });
    
    // Fermer le modal en cliquant à l'extérieur
    $(window).click(function(event) {
        if ($(event.target).hasClass('modal')) {
            $('.modal').removeClass('active');
        }
    });
});

// Fonction pour afficher les détails d'un rendez-vous
function showAppointmentDetails(appointmentId) {
    // جلب البيانات من API لضمان الدقة والحصول على الـ notes
    fetch('/api/appointments')
        .then(response => response.json())
        .then(appointments => {
            const appointment = appointments.find(apt => apt.id === appointmentId);
            
            if (appointment) {
                const serviceName = {
                    'consultation': 'Consultation générale',
                    'detartrage': 'Détartrage',
                    'blanchiment': 'Blanchiment dentaire',
                    'soins': 'Soins dentaires',
                    'urgence': 'Urgence dentaire',
                    'orthodontie': 'Orthodontie',
                    'implant': 'Implantologie'
                }[appointment.service] || appointment.service;
                
                const dentistName = {
                    'dr-martin': 'Dr. Sophie Martin',
                    'dr-lambert': 'Dr. Thomas Lambert',
                    'dr-dubois': 'Dr. Claire Dubois',
                    'dr-moreau': 'Dr. Julien Moreau',
                    '': 'Non spécifié'
                }[appointment.dentist] || 'Non spécifié';

                const statusLabel = {
                    'pending': 'En attente',
                    'confirmed': 'Confirmé',
                    'cancelled': 'Annulé'
                }[appointment.status] || 'En attente';
                const statusClass = appointment.status || 'pending';

                // Construire le contenu HTML
                const content = `
                    <div class="appointment-details">
                        <div class="detail-group">
                            <h3>Informations du patient</h3>
                            <div class="detail-item">
                                <span class="detail-label">Nom complet :</span>
                                <span class="detail-value">${appointment.full_name}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Téléphone :</span>
                                <span class="detail-value">${appointment.phone}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Email :</span>
                                <span class="detail-value">${appointment.email}</span>
                            </div>
                        </div>
                        
                        <div class="detail-group">
                            <h3>Détails du rendez-vous</h3>
                            <div class="detail-item">
                                <span class="detail-label">Service :</span>
                                <span class="detail-value service-badge">${serviceName}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Dentiste :</span>
                                <span class="detail-value">${dentistName}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Date :</span>
                                <span class="detail-value">${appointment.date}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Heure :</span>
                                <span class="detail-value">${appointment.time}</span>
                            </div>
                            ${appointment.notes ? `
                            <div class="detail-item">
                                <span class="detail-label">Notes :</span>
                                <span class="detail-value notes">${appointment.notes}</span>
                            </div>` : ''}
                        </div>
                        
                        <div class="detail-group">
                            <h3>Informations système</h3>
                            <div class="detail-item">
                                <span class="detail-label">Statut :</span>
                                <span class="detail-value status-badge status-${statusClass}">${statusLabel}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">ID du rendez-vous :</span>
                                <span class="detail-value appointment-id">${appointment.id}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Date de soumission :</span>
                                <span class="detail-value">${appointment.submitted_at}</span>
                            </div>
                        </div>
                        
                        <div class="detail-actions">
                            <a href="tel:${appointment.phone}" class="btn btn-primary">
                                <i class="fas fa-phone"></i> Appeler le patient
                            </a>
                            <a href="mailto:${appointment.email}?subject=Rappel%20de%20votre%20rendez-vous%20chez%20SmileDent" class="btn btn-secondary">
                                <i class="fas fa-envelope"></i> Envoyer un email
                            </a>
                        </div>
                    </div>
                `;
                
                $('#modalContent').html(content);
                $('#detailsModal').addClass('active');
            } else {
                showToast('Rendez-vous non trouvé!', 'error');
            }
        })
        .catch(err => {
            console.error(err);
            showToast('Erreur lors du chargement des détails.', 'error');
        });
}

// Fonction pour afficher des messages toast
function showToast(message, type = 'info') {
    const toast = $(`
        <div class="toast toast-${type}">
            <div class="toast-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="toast-close">&times;</button>
        </div>
    `);
    
    $('body').append(toast);
    
    setTimeout(() => {
        toast.addClass('show');
    }, 10);
    
    toast.find('.toast-close').click(function() {
        toast.removeClass('show');
        setTimeout(() => toast.remove(), 300);
    });
    
    setTimeout(() => {
        if (toast.hasClass('show')) {
            toast.removeClass('show');
            setTimeout(() => toast.remove(), 300);
        }
    }, 5000);
}

// Ajouter des styles pour les toasts
$(document).ready(function() {
    const toastStyles = `
        <style>
            .toast {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                padding: 15px 20px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                min-width: 300px;
                max-width: 400px;
                transform: translateY(100px);
                opacity: 0;
                transition: all 0.3s ease;
                z-index: 3000;
            }
            
            .toast.show {
                transform: translateY(0);
                opacity: 1;
            }
            
            .toast-success {
                border-left: 4px solid #4caf50;
            }
            
            .toast-error {
                border-left: 4px solid #f44336;
            }
            
            .toast-info {
                border-left: 4px solid #2196f3;
            }
            
            .toast-content {
                display: flex;
                align-items: center;
                gap: 10px;
                flex: 1;
            }
            
            .toast-content i {
                font-size: 1.2rem;
            }
            
            .toast-success .toast-content i {
                color: #4caf50;
            }
            
            .toast-error .toast-content i {
                color: #f44336;
            }
            
            .toast-info .toast-content i {
                color: #2196f3;
            }
            
            .toast-close {
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: #999;
                margin-left: 15px;
            }
        </style>
    `;
    
    $('head').append(toastStyles);
});