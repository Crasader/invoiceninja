<?php 

return array(

  // client
  'organization' => 'Organisatie',
  'name' => 'Naam',
  'website' => 'Website',
  'work_phone' => 'Telefoon',
  'address' => 'Adres',
  'address1' => 'Straat',
  'address2' => 'Huisnummer',
  'city' => 'Gemeente',
  'state' => 'Staat/Provincie',
  'postal_code' => 'Postcode',
  'country_id' => 'Land',
  'contacts' => 'Contacten',
  'first_name' => 'Voornaam',
  'last_name' => 'Achternaam',
  'phone' => 'Telefoon',
  'email' => 'Email',
  'additional_info' => 'Extra Informatie',
  'payment_terms' => 'Betalingsvoorwaarden',
  'currency_id' => 'Munteenheid',
  'size_id' => 'Grootte',
  'industry_id' => 'Industrie',
  'private_notes' => 'Priv&eacute; Berichten',

  // invoice
  'invoice' => 'Factuur',
  'client' => 'Klant',
  'invoice_date' => 'Factuur Datum',
  'due_date' => 'Verval Datum',
  'invoice_number' => 'Factuur Nummer',
  'invoice_number_short' => 'Factuur #',
  'po_number' => 'BTW Nummer',
  'po_number_short' => 'BTW #',
  'frequency_id' => 'Hoe vaak',
  'discount' => 'Korting',
  'taxes' => 'Belastingen',
  'tax' => 'Belasting',
  'item' => 'Artikel',
  'description' => 'Beschrijving',
  'unit_cost' => 'Stuksprijs',
  'quantity' => 'Hoeveelheid',
  'line_total' => 'Totaal lijn',
  'subtotal' => 'Subtotaal',
  'paid_to_date' => 'Betaal Datum',
  'balance_due' => 'Openstaand saldo',
  'invoice_design_id' => 'Ontwerp',
  'terms' => 'Voorwaarden',
  'your_invoice' => 'Jouw factuur',

  'remove_contact' => 'Verwijder contact',
  'add_contact' => 'Voeg contact toe',
  'create_new_client' => 'Maak nieuwe klant',
  'edit_client_details' => 'Pas klantdetails aan',
  'enable' => 'Activeer',
  'learn_more' => 'Meer te weten komen',
  'manage_rates' => 'Beheer prijzen',
  'note_to_client' => 'Bericht aan klant',
  'invoice_terms' => 'Factuur voorwaarden',
  'save_as_default_terms' => 'Opslaan als standaard voorwaarden',
  'download_pdf' => 'Download PDF',
  'pay_now' => 'Betaal nu',
  'save_invoice' => 'Sla Factuur op',
  'clone_invoice' => 'Kopieer Factuur',
  'archive_invoice' => 'Archiveer Factuur',
  'delete_invoice' => 'Verwijder Factuur',
  'email_invoice' => 'Email Factuur',
  'enter_payment' => 'Betaling ingeven',
  'tax_rates' => 'BTW tarief',
  'rate' => 'Tarief',
  'settings' => 'Instellingen',
  'enable_invoice_tax' => 'Activeer instelling van <b>BTW op volledige factuur</b>',
  'enable_line_item_tax' => 'Activeer instelling van <b>BTW per lijn</b>',

  // navigation
  'dashboard' => 'Dashboard',
  'clients' => 'Klanten',
  'invoices' => 'Facturen',
  'payments' => 'Betalingen',
  'credits' => 'Kredietnota\'s',
  'history' => 'Geschiedenis',
  'search' => 'Zoeken',
  'sign_up' => 'Aanmelden',
  'guest' => 'Gast',
  'company_details' => 'Bedrijfsdetails',
  'online_payments' => 'Online betalingen',
  'notifications' => 'Meldingen',
  'import_export' => 'Importeer/Exporteer',
  'done' => 'Klaar',
  'save' => 'Opslaan',
  'create' => 'Aanmaken',
  'upload' => 'Uploaden',
  'import' => 'Importeer',
  'download' => 'Downloaden',
  'cancel' => 'Annuleren',
  'provide_email' => 'Geef een geldig email-adres aub.',
  'powered_by' => 'Factuur gemaakt via',
  'no_items' => 'Geen artikelen',

  // recurring invoices
  'recurring_invoices' => 'Terugkerende facturen',
  'recurring_help' => '<p>Zend klanten automatisch wekelijks, twee keer per maand, maandelijks, per kwartaal of jaarlijks dezelfde facturen.</p>
        <p>Gebruik :MONTH, :QUARTER of :YEAR voor dynamische datums. Eenvoudige wiskunde werkt ook, bijvoorbeeld :MONTH-1.</p>
        <p>Voorbeelden van dynamische factuur variabelen:</p>
        <ul>
          <li>"Fitness lidmaatschap voor de maand :MONTH" => "Fitness lidmaatschap voor de maand juli"</li>
          <li>"Jaarlijks abonnement :YEAR+1" => "Jaarlijks abonnement 2015"</li>
          <li>"Betaling voor :QUARTER+1" => "Betaling voor Q2"</li>
        </ul>',

  // dashboard
  'in_total_revenue' => 'in totale opbrengst',
  'billed_client' => 'Gefactureerde klant',
  'billed_clients' => 'Gefactureerde klanten',
  'active_client' => 'Actieve klant',
  'active_clients' => 'Actieve klanten',  
  'invoices_past_due' => 'Facturen voorbij vervaldatum',
  'upcoming_invoices' => 'Aankomende facturen',
  'average_invoice' => 'Gemiddelde factuur',
  
  // list pages
  'archive' => 'Archiveer',
  'delete' => 'Verwijder',
  'archive_client' => 'Archiveer klant',
  'delete_client' => 'Verwijder klant',
  'archive_payment' => 'Archiveer betaling',
  'delete_payment' => 'Verwijder betaling',
  'archive_credit' => 'Archiveer kredietnota',
  'delete_credit' => 'Verwijder kredietnota',
  'show_archived_deleted' => 'Toon gearchiveerde/verwijderde',
  'filter' => 'Filter',
  'new_client' => 'Nieuwe Klant',
  'new_invoice' => 'Nieuwe Factuur',
  'new_payment' => 'Nieuwe Betaling',
  'new_credit' => 'Nieuwe Kredietnota',
  'contact' => 'Contact',
  'date_created' => 'Aanmaakdatum',
  'last_login' => 'Laatste login',
  'balance' => 'Saldo',
  'action' => 'Actie',
  'status' => 'Status',
  'invoice_total' => 'Factuur totaal',
  'frequency' => 'Frequentie',
  'start_date' => 'Startdatum',
  'end_date' => 'Einddatum',
  'transaction_reference' => 'Transactie Referentie',
  'method' => 'Methode',
  'payment_amount' => 'Betalingsbedrag',
  'payment_date' => 'Betalingsdatum',
  'credit_amount' => 'Kredietbedrag',
  'credit_balance' => 'Kredietsaldo',
  'credit_date' => 'Kredietdatum',
  'empty_table' => 'Geen gegevens beschikbaar in de tabel',
  'select' => 'Selecteer',
  'edit_client' => 'Klant aanpassen',
  'edit_invoice' => 'Factuur aanpassen',

  // client view page
  'create_invoice' => 'Factuur aanmaken',
  'enter_credit' => 'Kredietnota ingeven',
  'last_logged_in' => 'Laatste login',
  'details' => 'Details',
  'standing' => 'Openstaand',
  'credit' => 'Krediet',
  'activity' => 'Activiteit',
  'date' => 'Datum',
  'message' => 'Bericht',
  'adjustment' => 'Aanpassing',
  'are_you_sure' => 'Ben je zeker?',

  // payment pages
  'payment_type_id' => 'Betalingstype',
  'amount' => 'Bedrag',

  // account/company pages
  'work_email' => 'Email',
  'language_id' => 'Taal',
  'timezone_id' => 'Tijdszone',
  'date_format_id' => 'Formaat datum',
  'datetime_format_id' => 'Datum/Tijd Formaat',
  'users' => 'Gebruikers',
  'localization' => 'Localisatie',
  'remove_logo' => 'Verwijder logo',
  'logo_help' => 'Ondersteund: JPEG, GIF en PNG. Aangeraden hoogte: 120px',
  'payment_gateway' => 'Betalingsmiddel',
  'gateway_id' => 'Leverancier',
  'email_notifications' => 'Email Notificaties',
  'email_sent' => 'Email me wanneer een factuur is <b>verzonden</b>',
  'email_viewed' => 'Email me wanneer een factuur is <b>bekeken</b>',
  'email_paid' => 'Email me wanneer een factuur is <b>betaald</b>',
  'site_updates' => 'Site Aanpassingen',
  'custom_messages' => 'Aangepaste berichten',
  'default_invoice_terms' => 'Stel standaard factuursvoorwaarden in',
  'default_email_footer' => 'Stel standaard email signatuur in',
  'import_clients' => 'Importeer Klant Gegevens',
  'csv_file' => 'Selecteer CSV bestand',
  'export_clients' => 'Exporteer Klant Gegevens',
  'select_file' => 'Selecteer alstublieft een bestand',
  'first_row_headers' => 'Gebruik eerste rij als hoofdding',
  'column' => 'Kolom',
  'sample' => 'Voorbeeld',
  'import_to' => 'Importeer naar',
  'client_will_create' => 'klant zal aangemaakt worden',
  'clients_will_create' => 'klanten zullen aangemaakt worden',

  // application messages
  'created_client' => 'Klant succesvol aangemaakt',
  'created_clients' => ':count klanten succesvol aangemaakt',
  'updated_settings' => 'Instellingen succesvol aangepast',
  'removed_logo' => 'Logo succesvol verwijderd',
  'sent_message' => 'Bericht succesvol verzonden',
  'invoice_error' => 'Selecteer een klant alstublieft en corrigeer mogelijke fouten',
  'limit_clients' => 'Sorry, dit zal de klantenlimiet van :count klanten overschrijden',
  'payment_error' => 'Er was een fout bij het verwerken van uw betaling. Probeer later alstublieft opnieuw.',
  'registration_required' => 'Meld je aan om een factuur te mailen',
  'confirmation_required' => 'Bevestig je email adres alstublieft',

  'updated_client' => 'Klant succesvol aangepast',
  'created_client' => 'Klant succesvol aangemaakt',
  'archived_client' => 'Klant succesvol gearchiveerd',
  'archived_clients' => ':count klanten succesvol gearchiveerd',
  'deleted_client' => 'Klant succesvol verwijderd',
  'deleted_clients' => ':count klanten succesvol verwijderd',

  'updated_invoice' => 'Factuur succesvol aangepast',
  'created_invoice' => 'Factuur succesvol aangemaakt',
  'cloned_invoice' => 'Factuur succesvol gekopieerd',
  'emailed_invoice' => 'Factuur succesvol gemaild',
  'and_created_client' => 'en klant aangemaakt',
  'archived_invoice' => 'Factuur succesvol gearchiveerd',
  'archived_invoices' => ':count facturen succesvol gearchiveerd',
  'deleted_invoice' => 'Factuur succesvol verwijderd',
  'deleted_invoices' => ':count facturen succesvol verwijderd',

  'created_payment' => 'Betaling succesvol aangemaakt',
  'archived_payment' => 'Betaling succesvol gearchiveerd',
  'archived_payments' => ':count betalingen succesvol gearchiveerd',
  'deleted_payment' => 'Betaling succesvol verwijderd',
  'deleted_payments' => ':count betalingen succesvol verwijderd',
  'applied_payment' => 'Betaling succesvol toegepast',

  'created_credit' => 'Kredietnota succesvol aangemaakt',
  'archived_credit' => 'Kredietnota succesvol gearchiveerd',
  'archived_credits' => ':count kredietnota\'s succesvol gearchiveerd',
  'deleted_credit' => 'Kredietnota succesvol verwijderd',
  'deleted_credits' => ':count kredietnota\'s succesvol verwijderd',

  // Emails
  'confirmation_subject' => 'Invoice Ninja Bevestiging Account',
  'confirmation_header' => 'Bevestiging Account',
  'confirmation_message' => 'Ga alstublieft naar onderstaande link om je account te bevestiging.',
  'invoice_message' => 'Om je factuur voor :amount te bekijken, klik op onderstaande link.',
  'payment_subject' => 'Betaling ontvangen',
  'payment_message' => 'Bedankt voor je betaling van :amount.',
  'email_salutation' => 'Beste :name,',
  'email_signature' => 'Met vriendelijke groeten,',
  'email_from' => 'Het InvoiceNinja Team',
  'user_email_footer' => 'Ga alstublieft naar http://www.invoiceninja.com/company/notifications om je email notificatie instellingen aan te passen ',
  'invoice_link_message' => 'Klik op volgende link om de Factuur van je klant te bekijken:',
  'notification_paid_subject' => 'Factuur :invoice is betaald door :client',
  'notification_sent_subject' => 'Factuur :invoice is gezonden door :client',
  'notification_viewed_subject' => 'Factuur :invoice is bekeken door :client',
  'notification_paid' => 'Een betaling voor :amount is gemaakt door klant :client voor Factuur :invoice.',
  'notification_sent' => 'De volgende klant :client heeft Factuur :invoice voor :amount gemaild gekregen.',
  'notification_viewed' => 'De volgende klant :client heeft Factuur :invoice voor :amount bekeken.',
  'reset_password' => 'Je kan het paswoord van je account resetten door op volgende link te klikken:',
  'reset_password_footer' => 'Als je deze paswoord reset niet aangevraagd hebt contacteer dan onze helpdesk alstublieft: ' . CONTACT_EMAIL,

  // Payment page
  'secure_payment' => 'Veilige betaling',
  'card_number' => 'Kaart nummer',
  'expiration_month' => 'Verval maand',  
  'expiration_year' => 'Verval jaar',
  'cvv' => 'CVV',
  
  // Security alerts
  'confide' => [
    'too_many_attempts' => 'Te veel pogingen. Probeer opnieuw binnen enkele minuten.',
    'wrong_credentials' => 'Verkeerd emailadres of paswoord.',
    'confirmation' => 'Je account is bevestigd!',
    'wrong_confirmation' => 'Verkeerde bevestigingscode.',
    'password_forgot' => 'De informatie over je paswoord reset is verzonden naar je emailadres.',
    'password_reset' => 'Je paswoord is succesvol aangepast.',
    'wrong_password_reset' => 'Ongeldig paswoord. Probeer opnieuw',
  ],
  
  // Pro Plan
  'pro_plan' => [
    'remove_logo' => ':link om het Invoice Ninja logo te verwijderen door het pro plan te nemen',
    'remove_logo_link' => 'Klik hier',
  ],

  'logout' => 'Afmelden',    
  'sign_up_to_save' => 'Registreer je om je werk op te slaan',  
  'agree_to_terms' =>'Ik accepteer de Invoice Ninja :terms',
  'terms_of_service' => 'Gebruiksvoorwaarden',
  'email_taken' => 'Het e-mailadres is al geregistreerd',
  'working' => 'Actief',
  'success' => 'Succes',
  'success_message' => 'Je bent succesvol geregistreerd. Ga alstublieft naar de link in de bevestigingsmail om je e-mailadres te verifi&euml;ren.',
  'erase_data' => 'Dit zal uw data permanent verwijderen.',
  'password' => 'Wachtwoord',
  'invoice_subject' => 'Nieuwe factuur van :account',
  'close' => 'Sluiten',  
  
);
