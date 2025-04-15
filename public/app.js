let dotsInterval;

function startDotsAnimation() {
    const dots = $('#dots');
    let count = 0;
    dotsInterval = setInterval(() => {
        count = (count + 1) % 4;
        dots.text('.'.repeat(count));
        //console.log('Points actuels :', '.'.repeat(count));
    }, 500);
}

function stopDotsAnimation() {
    clearInterval(dotsInterval);
    $('#dots').text(''); // Réinitialise les points
}

function calculateTotalDuration() {
    let total = 0;

    // Parcourir chaque ligne du tableau et additionner les valeurs de la colonne "Durée"
    $('#sequenceBody tr').each(function() {
        const duration = parseFloat($(this).find('.duration').val());
        if (!isNaN(duration)) {
            total += duration;
        }
    });

    // Mettre à jour la cellule de total
    $('#totalDurationCell').text(total.toFixed(2)); // Affiche avec 2 décimales
}

function showStatusMessage(message, color = 'blue') {
    const statusMessage = $('#status-message');
    statusMessage.css({
        display: 'block', // Affiche le message
        color: color // Définit la couleur du texte
    });
    statusMessage.html(message); // Met à jour le contenu du message
}

function hideStatusMessage() {
    $('#status-message').fadeOut(5000); // Cache le message après 5 secondes
}

$(document).on('input', '.duration', function() {
    calculateTotalDuration();
});

$(document).ready(function() {

    let sequence = [];

    // Charger la séquence initiale depuis le serveur
    function loadSequence() {
        $.get('/get-sequence', function(data) {
            //console.log('Séquence reçue :', data.sequence);
            //console.log('Constantes reçues :', data.constants);

            // Utilisez les constantes pour mettre à jour l'interface utilisateur
            $('#timeout').val(data.constants.TIMEOUT_MN);
            $('#speed1-min').val(data.constants.SPEED1_MIN);
            $('#speed1-max').val(data.constants.SPEED1_MAX);
            $('#speed2-min').val(data.constants.SPEED2_MIN);
            $('#speed2-max').val(data.constants.SPEED2_MAX);

            sequence = data.sequence;
            renderSequenceTable();
        });
    }

    // Rendre la table avec la séquence
    function renderSequenceTable() {
        $('#sequenceBody').empty();
        sequence.forEach((step, index) => {
            addRowToTable(step, index);
        });

        // Rendre les lignes du tableau réordonnables
        $('#sequenceBody').sortable({
            update: function(event, ui) {
                // Mettre à jour l'ordre de la séquence après le drag & drop
                updateSequenceOrder();
            }
        });

        calculateTotalDuration();
    }

    function updateSequenceOrder() {
        const newSequence = [];
        $('#sequenceBody tr').each(function() {
            const rowIndex = $(this).index();
            newSequence.push(sequence[rowIndex]); // Réorganise la séquence en fonction de l'ordre des lignes
        });
        sequence = newSequence; // Met à jour la séquence avec le nouvel ordre
        updateRowIndices(); // Met à jour les indices affichés dans la première colonne
    }

    function addRowToTable(step, index) {
        const row = `
            <tr>
                <td>${index + 1}</td>
                <td><input type="number" class="duration" value="${step.duration}" /></td>
                <td>
                    <input type="number" class="speed0-min" value="${step.speed0.min}" />
                    <input type="range" class="speed0-min-slider" min="0" max="255" value="${step.speed0.min}" />
                </td>
                <td>
                    <input type="number" class="speed0-max" value="${step.speed0.max}" />
                    <input type="range" class="speed0-max-slider" min="0" max="255" value="${step.speed0.max}" />
                </td>
                <td>
                    <input type="number" class="speed1-min" value="${step.speed1.min}" />
                    <input type="range" class="speed1-min-slider" min="0" max="255" value="${step.speed1.min}" />
                </td>
                <td>
                    <input type="number" class="speed1-max" value="${step.speed1.max}" />
                    <input type="range" class="speed1-max-slider" min="0" max="255" value="${step.speed1.max}" />
                </td>
                <td class="hidden"><input type="number" class="ramp hidden" value="${step.ramp}" /></td>
                <td>
                    <button class="duplicateRowBtn" title="dupliquer">2x</button>
                    <button class="deleteRowBtn" title="supprimer">X</button>
                </td>
            </tr>
        `;
        $('#sequenceBody').append(row);

        const lastRow = $('#sequenceBody tr:last-child');

        // Synchroniser les sliders avec les inputs
        lastRow.find('.speed0-min').on('input', function() {
            const value = $(this).val();
            lastRow.find('.speed0-min-slider').val(value);
        });
        lastRow.find('.speed0-min-slider').on('input', function() {
            const value = $(this).val();
            lastRow.find('.speed0-min').val(value).trigger('input');
        });

        lastRow.find('.speed0-max').on('input', function() {
            const value = $(this).val();
            lastRow.find('.speed0-max-slider').val(value);
        });
        lastRow.find('.speed0-max-slider').on('input', function() {
            const value = $(this).val();
            lastRow.find('.speed0-max').val(value).trigger('input');
        });

        lastRow.find('.speed1-min').on('input', function() {
            const value = $(this).val();
            lastRow.find('.speed1-min-slider').val(value);
        });
        lastRow.find('.speed1-min-slider').on('input', function() {
            const value = $(this).val();
            lastRow.find('.speed1-min').val(value).trigger('input');
        });

        lastRow.find('.speed1-max').on('input', function() {
            const value = $(this).val();
            lastRow.find('.speed1-max-slider').val(value);
        });
        lastRow.find('.speed1-max-slider').on('input', function() {
            const value = $(this).val();
            lastRow.find('.speed1-max').val(value).trigger('input');
        });

        // Synchroniser speed0-min avec speed0-max
        lastRow.find('.speed0-min').on('input', function() {
            const minValue = parseFloat($(this).val());
            const maxInput = lastRow.find('.speed0-max');
            if (minValue > parseFloat(maxInput.val()) || maxInput.val() === "") {
                maxInput.val(minValue);
                lastRow.find('.speed0-max-slider').val(minValue);
            }
        });

        // Synchroniser speed0-max avec speed0-min
        lastRow.find('.speed0-max').on('input', function() {
            const maxValue = parseFloat($(this).val());
            const minInput = lastRow.find('.speed0-min');
            if (maxValue < parseFloat(minInput.val())) {
                minInput.val(maxValue);
                lastRow.find('.speed0-min-slider').val(maxValue);
            }
        });

        // Synchroniser speed1-min avec speed1-max
        lastRow.find('.speed1-min').on('input', function() {
            const minValue = parseFloat($(this).val());
            const maxInput = lastRow.find('.speed1-max');
            if (minValue > parseFloat(maxInput.val()) || maxInput.val() === "") {
                maxInput.val(minValue);
                lastRow.find('.speed1-max-slider').val(minValue);
            }
        });

        // Synchroniser speed1-max avec speed1-min
        lastRow.find('.speed1-max').on('input', function() {
            const maxValue = parseFloat($(this).val());
            const minInput = lastRow.find('.speed1-min');
            if (maxValue < parseFloat(minInput.val())) {
                minInput.val(maxValue);
                lastRow.find('.speed1-min-slider').val(maxValue);
            }
        });

        // Gestionnaire pour le bouton "Supprimer"
        lastRow.find('.deleteRowBtn').click(function() {
            const rowIndex = $(this).closest('tr').index();
            sequence.splice(rowIndex, 1);
            $(this).closest('tr').remove();
            updateRowIndices();
        });

        // Gestionnaire pour le bouton "Dupliquer"
        lastRow.find('.duplicateRowBtn').click(function() {
            const rowIndex = $(this).closest('tr').index();
            duplicateRow(rowIndex);
        });

        calculateTotalDuration();
    }

    function duplicateRow(index) {
        // Trouver la ligne à dupliquer
        const rowToDuplicate = $('#sequenceBody tr').eq(index);

        // Cloner la ligne HTML
        const clonedRow = rowToDuplicate.clone();

        // Insérer la ligne clonée juste après la ligne originale
        clonedRow.insertAfter(rowToDuplicate);

        // Mettre à jour les indices des lignes
        updateRowIndices();

        // Ajouter les gestionnaires d'événements pour les boutons "Supprimer" et "Dupliquer" dans la nouvelle ligne
        clonedRow.find('.deleteRowBtn').click(function() {
            const rowIndex = $(this).closest('tr').index();
            $('#sequenceBody tr').eq(rowIndex).remove(); // Supprime la ligne du tableau
            updateRowIndices(); // Met à jour les indices des lignes
        });

        clonedRow.find('.duplicateRowBtn').click(function() {
            const rowIndex = $(this).closest('tr').index();
            duplicateRow(rowIndex); // Appelle la fonction pour dupliquer la ligne
        });

        calculateTotalDuration();
    }

    // Ajouter une nouvelle ligne à la séquence
    $('#addRowBtn').click(function() {
        const newStep = {
            duration: 1.0,
            speed0: { min: 0, max: 0 },
            speed1: { min: 0, max: 0 },
            ramp: { min: 0 }
        };
        sequence.push(newStep); // Ajoute le nouvel élément à la séquence
        addRowToTable(newStep, sequence.length - 1); // Ajoute une nouvelle ligne au tableau
    });

    function updateRowIndices() {
        $('#sequenceBody tr').each(function(index) {
            $(this).find('td:first-child').text(index + 1); // Met à jour l'indice de la ligne
        });

        calculateTotalDuration();
    }

    function saveSequence(callback) {
        const updatedSequence = [];

        $('#sequenceBody tr').each(function() {
            const step = {
                duration: parseFloat($(this).find('.duration').val()),
                speed0: {
                    min: parseFloat($(this).find('.speed0-min').val()),
                    max: parseFloat($(this).find('.speed0-max').val()) || parseFloat($(this).find('.speed0-min').val())
                },
                speed1: {
                    min: parseFloat($(this).find('.speed1-min').val()),
                    max: parseFloat($(this).find('.speed1-max').val()) || parseFloat($(this).find('.speed1-min').val())
                },
                ramp: parseFloat(0)//$(this).find('.ramp').val())
            };
            updatedSequence.push(step);
        });

        const constants = {
            timeout: parseFloat($('#timeout').val()),
            speed1Min: parseInt($('#speed1-min').val()),
            speed1Max: parseInt($('#speed1-max').val()),
            speed2Min: parseInt($('#speed2-min').val()),
            speed2Max: parseInt($('#speed2-max').val())
        };

        const statusMessage = $('#status-message');
        const messageText = $('#message-text');
        statusMessage.css('color', 'blue');

        statusMessage.show();
        messageText.text('Sauvegarde de la séquence en cours');
        startDotsAnimation(); // Démarre l'animation des trois petits points

        //console.log(updatedSequence)

        $.ajax({
            url: '/save-sequence',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ sequence: updatedSequence, constants: constants }),
            success: function(response) {
                messageText.text('Séquence et constantes sauvegardées avec succès.');
                stopDotsAnimation();
                setTimeout(() => statusMessage.hide(), 5000);

                if (callback) {
                    callback();
                }
            },
            error: function(error) {
                messageText.text('Erreur lors de la sauvegarde.');
                stopDotsAnimation();
                statusMessage.css('color', 'red');
            }
        });
    }

    $('#saveSequenceBtn').click(function() {
        showStatusMessage('Sauvegarde de la séquence en cours...', 'blue');
        saveSequence(function() {
            showStatusMessage('Séquence sauvegardée avec succès.', 'green');
            hideStatusMessage();
        });
    });

    $('#saveCompileUploadBtn').click(function() {
        const selectedPort = $('#arduino-port').val();
        if (!selectedPort) {
            showStatusMessage("Veuillez sélectionner un port Arduino.", 'red');
            return;
        }

        showStatusMessage('Sauvegarde de la séquence en cours...', 'blue');
        saveSequence(function() {
            showStatusMessage('Séquence sauvegardée avec succès.<br>Compilation en cours...', 'blue');
            startDotsAnimation(); // Démarre l'animation des trois petits points

            $.ajax({
                url: '/compile-upload',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ port: selectedPort }),
                success: function(response) {
                    showStatusMessage('Code compilé et téléversé avec succès sur l\'Arduino.', 'green');
                    stopDotsAnimation(); // Arrête l'animation
                },
                error: function(error) {
                    showStatusMessage('Erreur lors du téléversement sur l\'Arduino.', 'red');
                    stopDotsAnimation();
                }
            });
        });
    });

    // Charger les ports Arduino disponibles
    $.get('/list-ports', function (data) {
        const portSelect = $('#arduino-port');
        portSelect.empty(); // Vider les options existantes

        data.ports.forEach(port => {
            const optionText = `${port.port} (${port.boardName})`; // Format : port (boardName)
            portSelect.append(`<option value="${port.port}">${optionText}</option>`);
        });
    });

    // Charger la séquence lors du chargement de la page
    loadSequence();

});