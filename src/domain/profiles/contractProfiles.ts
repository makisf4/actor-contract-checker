import { ContractTypeId } from '../contractType/contractTypes';
import { RiskId } from '../risks/riskMetadata';

export type ProfileId = ContractTypeId;
export type SummaryFieldId = string;
export type QuestionId = string;
export type NegotiationId = string;

export const CONTRACT_PROFILES: Record<ProfileId, {
  summaryFields: Array<{
    id: SummaryFieldId;
    label: string;
    extractorHint: string;
    showFor: ProfileId[];
  }>;
  allowedRiskIds: RiskId[];
  missingClausesMap: Record<SummaryFieldId, {
    title: string;
    why: string;
    ask: string;
    riskId?: RiskId;
  }>;
  questions: Array<{ id: QuestionId; text: string }>;
  negotiation: Array<{
    id: NegotiationId;
    title: string;
    why: string;
    proposed: string;
  }>;
}> = {
  film: {
    summaryFields: [
      { id: 'role', label: 'Αντικείμενο / Ρόλος', extractorHint: 'Ρόλος/χαρακτήρας ή αντικείμενο εργασίας', showFor: ['film'] },
      { id: 'shoot_period', label: 'Περίοδος γυρισμάτων', extractorHint: 'Περίοδος/διάρκεια γυρισμάτων ή εργασίας', showFor: ['film'] },
      { id: 'fee_payment', label: 'Αμοιβή & τρόπος πληρωμής', extractorHint: 'Συνολική αμοιβή και όροι πληρωμής', showFor: ['film'] },
      { id: 'exploitation_media', label: 'Μέσα εκμετάλλευσης', extractorHint: 'Cinema/streaming/festival/PR', showFor: ['film'] },
      { id: 'image_scope', label: 'Έκταση δικαιωμάτων εικόνας (scope)', extractorHint: 'Εύρος/διάρκεια χρήσης εικόνας/φωνής', showFor: ['film'] },
      { id: 'territory', label: 'Περιοχές (territory)', extractorHint: 'Χώρες/περιοχές εκμετάλλευσης', showFor: ['film'] },
      { id: 'ai_usage', label: 'AI / Ψηφιακή χρήση', extractorHint: 'Αναφορά σε AI/digital χρήση (αν υπάρχει)', showFor: ['film'] },
      { id: 'credits', label: 'Credits (on-screen)', extractorHint: 'Αναφορά σε τίτλους/credits', showFor: ['film'] },
      { id: 'termination_compensation', label: 'Αποζημίωση σε Πρόωρη Λύση', extractorHint: 'Αποζημίωση/πρόβλεψη σε πρόωρη λύση', showFor: ['film'] },
    ],
    allowedRiskIds: [
      'duration',
      'payment_terms',
      'image_rights',
      'exclusivity',
      'reuse',
      'ai_digital_double',
      'buyout',
      'termination',
      'reputation_moral',
    ],
    missingClausesMap: {
      role: {
        title: 'Αντικείμενο / Ρόλος',
        why: 'Χωρίς σαφή ρόλο μπορεί να αλλάξει το εύρος εργασίας ή οι υποχρεώσεις.',
        ask: 'Να οριστεί ρητά ο ρόλος ή το αντικείμενο εργασίας.',
      },
      shoot_period: {
        title: 'Περίοδος Γυρισμάτων',
        why: 'Ασαφές χρονοδιάγραμμα επηρεάζει τη διαθεσιμότητα και άλλες συνεργασίες.',
        ask: 'Να οριστεί συγκεκριμένη περίοδος ή βασικές ημερομηνίες γυρισμάτων.',
      },
      fee_payment: {
        title: 'Αμοιβή & Πληρωμή',
        why: 'Η απουσία όρων πληρωμής αυξάνει τον κίνδυνο καθυστερήσεων.',
        ask: 'Να οριστεί ποσό και χρονοδιάγραμμα πληρωμών.',
        riskId: 'payment_terms',
      },
      image_scope: {
        title: 'Έκταση Δικαιωμάτων Εικόνας',
        why: 'Χωρίς σαφή όρια, η εικόνα μπορεί να χρησιμοποιηθεί πέρα από την ταινία.',
        ask: 'Να περιοριστεί η χρήση αποκλειστικά στο έργο.',
        riskId: 'image_rights',
      },
      territory: {
        title: 'Περιοχές Χρήσης',
        why: 'Χωρίς περιορισμό, το έργο μπορεί να αξιοποιηθεί σε αγορές που δεν υπολογίστηκαν.',
        ask: 'Να οριστούν ρητά οι χώρες/περιοχές εκμετάλλευσης.',
      },
      exploitation_media: {
        title: 'Μέσα Εκμετάλλευσης',
        why: 'Ασαφή μέσα επιτρέπουν χρήση σε πλατφόρμες που δεν συμφωνήθηκαν.',
        ask: 'Να καθοριστούν τα μέσα (κινηματογράφος, streaming, PR κ.λπ.).',
      },
      ai_usage: {
        title: 'Ψηφιακή / AI Χρήση',
        why: 'Δεν είναι σαφές αν επιτρέπεται μελλοντική ψηφιακή αναπαραγωγή.',
        ask: 'Να προβλεφθεί ρητός αποκλεισμός ή ειδική συναίνεση.',
        riskId: 'ai_digital_double',
      },
      credits: {
        title: 'Credits (On-screen)',
        why: 'Χωρίς πρόβλεψη credits, χάνεται η αναγνώριση της συμμετοχής.',
        ask: 'Να προβλεφθεί ρητή αναφορά στους τίτλους.',
      },
      termination_compensation: {
        title: 'Αποζημίωση σε Πρόωρη Λύση',
        why: 'Η απουσία πρόβλεψης αφήνει τον ηθοποιό εκτεθειμένο.',
        ask: 'Να προβλεφθεί ελάχιστη αποζημίωση.',
        riskId: 'termination',
      },
    },
    questions: [
      { id: 'film_q1', text: 'Ποιος είναι ο ακριβής ρόλος/χαρακτήρας που περιγράφεται στο συμβόλαιο;' },
      { id: 'film_q2', text: 'Ποια είναι η ακριβής περίοδος γυρισμάτων και υπάρχει ευελιξία στις ημερομηνίες;' },
      { id: 'film_q3', text: 'Ποια μέσα εκμετάλλευσης καλύπτονται (κινηματογράφος, streaming, φεστιβάλ, PR);' },
      { id: 'film_q4', text: 'Για πόσο χρόνο και σε ποιες χώρες θα ισχύουν τα δικαιώματα χρήσης εικόνας/φωνής;' },
      { id: 'film_q5', text: 'Υπάρχουν περιορισμοί σε άλλες συνεργασίες ή έργα κατά τη διάρκεια της παραγωγής;' },
      { id: 'film_q6', text: 'Πότε και πώς καταβάλλεται η αμοιβή; Υπάρχουν σαφείς όροι πληρωμής;' },
      { id: 'film_q7', text: 'Υπάρχει πρόβλεψη για χρήση AI ή ψηφιακού αντιγράφου; Αν ναι, υπό ποιους όρους;' },
      { id: 'film_q8', text: 'Υπάρχει ρητή αναφορά στα credits (on-screen);' },
    ],
    negotiation: [
      { id: 'film_n1', title: 'Διάρκεια δικαιωμάτων χρήσης', why: 'Περιορίζει την υπερβολική έκθεση χωρίς πρόσθετη αμοιβή.', proposed: 'Η χρήση εικόνας/φωνής ισχύει για [Χ] έτη, με δυνατότητα ανανέωσης μόνο με γραπτή συναίνεση και πρόσθετη αμοιβή.' },
      { id: 'film_n2', title: 'Εδαφική εμβέλεια', why: 'Ξεκαθαρίζει τις αγορές όπου μπορεί να χρησιμοποιηθεί το έργο.', proposed: 'Η εκμετάλλευση περιορίζεται σε [περιοχή]. Για επέκταση σε νέες χώρες, απαιτείται πρόσθετη συμφωνία.' },
      { id: 'film_n3', title: 'AI / ψηφιακή χρήση', why: 'Αποτρέπει μη εξουσιοδοτημένη χρήση ψηφιακού αντιγράφου.', proposed: 'Η χρήση AI ή ψηφιακού αντιγράφου απαιτεί ξεχωριστή έγκριση και πρόσθετη αμοιβή.' },
      { id: 'film_n4', title: 'Όροι πληρωμής', why: 'Κατοχυρώνει σαφή χρονικά όρια πληρωμής.', proposed: 'Η πληρωμή καταβάλλεται εντός [30] ημερών από την ολοκλήρωση των γυρισμάτων.' },
      { id: 'film_n5', title: 'Credits', why: 'Διασφαλίζει την αναγνώριση της συμμετοχής.', proposed: 'Ο ηθοποιός αναφέρεται στους τίτλους τέλους με τον συμφωνημένο τρόπο (όνομα/ρόλος).' },
    ],
  },

  series: {
    summaryFields: [
      { id: 'role', label: 'Αντικείμενο / Ρόλος', extractorHint: 'Ρόλος/χαρακτήρας', showFor: ['series'] },
      { id: 'shoot_period', label: 'Περίοδος γυρισμάτων', extractorHint: 'Περίοδος/διάρκεια γυρισμάτων', showFor: ['series'] },
      { id: 'fee_payment', label: 'Αμοιβή & τρόπος πληρωμής', extractorHint: 'Αμοιβή ανά επεισόδιο ή συνολικά', showFor: ['series'] },
      { id: 'exploitation_media', label: 'Μέσα εκμετάλλευσης', extractorHint: 'Streaming/TV/πλατφόρμες/PR', showFor: ['series'] },
      { id: 'image_scope', label: 'Έκταση δικαιωμάτων εικόνας (scope)', extractorHint: 'Εύρος/διάρκεια χρήσης εικόνας/φωνής', showFor: ['series'] },
      { id: 'territory', label: 'Περιοχές (territory)', extractorHint: 'Χώρες/περιοχές εκμετάλλευσης', showFor: ['series'] },
      { id: 'ai_usage', label: 'AI / Ψηφιακή χρήση', extractorHint: 'Αναφορά σε AI/digital χρήση (αν υπάρχει)', showFor: ['series'] },
      { id: 'credits', label: 'Credits (on-screen)', extractorHint: 'Αναφορά σε τίτλους/credits', showFor: ['series'] },
      { id: 'termination_compensation', label: 'Αποζημίωση σε Πρόωρη Λύση', extractorHint: 'Αποζημίωση/πρόβλεψη σε πρόωρη λύση', showFor: ['series'] },
    ],
    allowedRiskIds: [
      'duration',
      'payment_terms',
      'image_rights',
      'exclusivity',
      'reuse',
      'ai_digital_double',
      'buyout',
      'termination',
      'reputation_moral',
    ],
    missingClausesMap: {
      role: {
        title: 'Αντικείμενο / Ρόλος',
        why: 'Χωρίς σαφή ρόλο μπορεί να αλλάξουν οι υποχρεώσεις ανά επεισόδιο.',
        ask: 'Να οριστεί ρητά ο ρόλος ή το αντικείμενο εργασίας.',
      },
      shoot_period: {
        title: 'Περίοδος Γυρισμάτων',
        why: 'Ασαφές χρονοδιάγραμμα επηρεάζει τη διαθεσιμότητα.',
        ask: 'Να οριστεί συγκεκριμένη περίοδος ή βασικές ημερομηνίες.',
      },
      fee_payment: {
        title: 'Αμοιβή & Πληρωμή',
        why: 'Χωρίς όρους πληρωμής υπάρχει κίνδυνος καθυστέρησης.',
        ask: 'Να οριστεί αμοιβή ανά επεισόδιο ή συνολικά και τρόπος πληρωμής.',
        riskId: 'payment_terms',
      },
      exploitation_media: {
        title: 'Μέσα Εκμετάλλευσης',
        why: 'Ασαφή μέσα επιτρέπουν χρήση σε πλατφόρμες που δεν συμφωνήθηκαν.',
        ask: 'Να καθοριστούν ρητά τα μέσα εκμετάλλευσης.',
      },
      image_scope: {
        title: 'Δικαιώματα Χρήσης Εικόνας',
        why: 'Απροσδιόριστη χρήση επιτρέπει ευρεία εκμετάλλευση χωρίς έλεγχο.',
        ask: 'Να οριστεί διάρκεια και εύρος χρήσης εικόνας/φωνής.',
        riskId: 'image_rights',
      },
      territory: {
        title: 'Περιοχές Χρήσης',
        why: 'Χωρίς περιοχές, η χρήση μπορεί να επεκταθεί διεθνώς χωρίς συμφωνία.',
        ask: 'Να οριστούν ρητά οι χώρες/περιοχές εκμετάλλευσης.',
      },
      ai_usage: {
        title: 'Χρήση AI / Ψηφιακού Αντιγράφου',
        why: 'Η απουσία πρόβλεψης επιτρέπει μελλοντική χρήση χωρίς συναίνεση.',
        ask: 'Να αποκλειστεί ή να προβλεφθεί πρόσθετη αμοιβή.',
        riskId: 'ai_digital_double',
      },
      credits: {
        title: 'Credits (On-screen)',
        why: 'Χωρίς credits, δεν διασφαλίζεται η αναγνώριση.',
        ask: 'Να προβλεφθεί ρητή αναφορά στους τίτλους.',
      },
      termination_compensation: {
        title: 'Αποζημίωση σε Πρόωρη Λύση',
        why: 'Η απουσία πρόβλεψης αφήνει τον ηθοποιό εκτεθειμένο.',
        ask: 'Να προβλεφθεί ελάχιστη αποζημίωση.',
        riskId: 'termination',
      },
    },
    questions: [
      { id: 'series_q1', text: 'Πόσα επεισόδια/ποια σεζόν καλύπτει η συμφωνία;' },
      { id: 'series_q2', text: 'Η αμοιβή είναι ανά επεισόδιο ή συνολικά; Πότε καταβάλλεται;' },
      { id: 'series_q3', text: 'Υπάρχουν όροι για επαναλήψεις ή streaming; Προβλέπεται πρόσθετη αμοιβή;' },
      { id: 'series_q4', text: 'Για πόσο χρόνο και σε ποιες χώρες ισχύουν τα δικαιώματα χρήσης;' },
      { id: 'series_q5', text: 'Υπάρχουν περιορισμοί σε άλλες συνεργασίες κατά τη διάρκεια της σεζόν;' },
      { id: 'series_q6', text: 'Υπάρχει πρόβλεψη για χρήση AI ή ψηφιακού αντιγράφου; Αν ναι, υπό ποιους όρους;' },
      { id: 'series_q7', text: 'Υπάρχει ρητή αναφορά στα credits;' },
    ],
    negotiation: [
      { id: 'series_n1', title: 'Αμοιβή ανά επεισόδιο', why: 'Διασφαλίζει σαφή αντιστοίχιση αμοιβής και παραδοτέων.', proposed: 'Η αμοιβή καθορίζεται ανά επεισόδιο, με σαφές ποσό και ημερομηνία πληρωμής.' },
      { id: 'series_n2', title: 'Streaming & reruns', why: 'Καλύπτει επιπλέον εκμετάλλευση του υλικού.', proposed: 'Για streaming ή επαναλήψεις, προβλέπεται πρόσθετη αμοιβή ανά κύκλο χρήσης.' },
      { id: 'series_n3', title: 'Διάρκεια δικαιωμάτων', why: 'Περιορίζει χρήση χωρίς αναθεώρηση.', proposed: 'Η χρήση εικόνας/φωνής ισχύει για [Χ] έτη και απαιτεί ανανέωση με συναίνεση.' },
      { id: 'series_n4', title: 'AI / ψηφιακή χρήση', why: 'Προστατεύει από μελλοντικές τεχνολογικές χρήσεις χωρίς έλεγχο.', proposed: 'Η χρήση AI ή ψηφιακού αντιγράφου απαιτεί ξεχωριστή συναίνεση και πρόσθετη αμοιβή.' },
      { id: 'series_n5', title: 'Credits', why: 'Εξασφαλίζει αναγνώριση της συμμετοχής.', proposed: 'Ο ηθοποιός αναφέρεται στους τίτλους με τον συμφωνημένο τρόπο.' },
    ],
  },

  ad: {
    summaryFields: [
      { id: 'tvc_deliverable', label: 'TVC / Παραδοτέο', extractorHint: 'Διάρκεια spot, είδος παραδοτέου', showFor: ['ad'] },
      { id: 'usage_term', label: 'Διάρκεια χρήσης (term)', extractorHint: 'Χρονική διάρκεια χρήσης', showFor: ['ad'] },
      { id: 'territory', label: 'Περιοχές (territory)', extractorHint: 'Χώρες/περιοχές εκμετάλλευσης', showFor: ['ad'] },
      { id: 'media_tv', label: 'Μέσα (TV κανάλια)', extractorHint: 'Κανάλια/μέσα προβολής', showFor: ['ad'] },
      { id: 'exclusivity', label: 'Αποκλειστικότητα', extractorHint: 'Κατηγορία/διάρκεια/ανταγωνιστές', showFor: ['ad'] },
      { id: 'buyout_renewals', label: 'Buyout / Ανανεώσεις', extractorHint: 'Buyout, κύκλοι ανανέωσης', showFor: ['ad'] },
      { id: 'cutdowns', label: 'Cutdowns / Edits / Versions', extractorHint: 'Αναφορά σε cutdowns ή edits', showFor: ['ad'] },
      { id: 'ai_voice', label: 'AI / Ψηφιακό / Voice', extractorHint: 'AI, ψηφιακό αντίγραφο, voice cloning', showFor: ['ad'] },
      { id: 'approvals', label: 'Δικαιώματα έγκρισης', extractorHint: 'Approval rights για τελικό υλικό', showFor: ['ad'] },
    ],
    allowedRiskIds: [
      'duration',
      'payment_terms',
      'image_rights',
      'exclusivity',
      'buyout',
      'cut_versions_reuse',
      'advertising_reuse',
      'ai_digital_double',
      'voice_cloning',
      'reuse',
      'termination',
      'reputation_moral',
    ],
    missingClausesMap: {
      tvc_deliverable: {
        title: 'TVC / Παραδοτέο',
        why: 'Χωρίς σαφές παραδοτέο μπορεί να ζητηθούν περισσότερες χρήσεις ή υλικά.',
        ask: 'Να οριστεί το είδος και η διάρκεια του spot.',
      },
      usage_term: {
        title: 'Διάρκεια Χρήσης',
        why: 'Αν δεν ορίζεται διάρκεια, η χρήση μπορεί να θεωρηθεί απεριόριστη.',
        ask: 'Να προβλεφθεί συγκεκριμένη διάρκεια χρήσης.',
        riskId: 'duration',
      },
      territory: {
        title: 'Περιοχές Χρήσης',
        why: 'Χωρίς σαφή περιορισμό, το υλικό μπορεί να προβληθεί εκτός της αγοράς που υπολογίστηκε η αμοιβή.',
        ask: 'Να οριστούν ρητά οι χώρες προβολής.',
      },
      media_tv: {
        title: 'Μέσα / Κανάλια',
        why: 'Ασαφή μέσα επιτρέπουν προβολή σε πλατφόρμες που δεν υπολογίστηκαν.',
        ask: 'Να οριστούν τα κανάλια ή τα μέσα προβολής.',
      },
      exclusivity: {
        title: 'Αποκλειστικότητα',
        why: 'Χωρίς όρους αποκλειστικότητας, οι περιορισμοί μπορεί να είναι υπερβολικοί ή ασαφείς.',
        ask: 'Να οριστούν κατηγορία, διάρκεια και ανταγωνιστικές μάρκες.',
        riskId: 'exclusivity',
      },
      buyout_renewals: {
        title: 'Buyout / Ανανεώσεις',
        why: 'Η απουσία όρων ανανέωσης αφήνει ασαφή την πρόσθετη αμοιβή.',
        ask: 'Να προβλεφθεί buyout με σαφή διάρκεια και κόστος ανανέωσης.',
        riskId: 'buyout',
      },
      cutdowns: {
        title: 'Cutdowns / Edits / Versions',
        why: 'Χωρίς πρόβλεψη, μπορεί να γίνουν edits χωρίς πρόσθετη αμοιβή.',
        ask: 'Να απαιτείται ξεχωριστή έγκριση και αμοιβή για κάθε cutdown/edit.',
        riskId: 'cut_versions_reuse',
      },
      ai_voice: {
        title: 'Χρήση AI / Ψηφιακού Αντιγράφου',
        why: 'Η απουσία πρόβλεψης αφήνει ανοιχτό το ενδεχόμενο μελλοντικής χρήσης χωρίς έλεγχο.',
        ask: 'Να αποκλειστεί ρητά ή να προβλεφθεί πρόσθετη αμοιβή.',
        riskId: 'ai_digital_double',
      },
      approvals: {
        title: 'Δικαιώματα Έγκρισης',
        why: 'Χωρίς approval rights, μπορεί να χρησιμοποιηθεί υλικό που δεν εγκρίθηκε.',
        ask: 'Να προβλεφθούν δικαιώματα έγκρισης για το τελικό υλικό.',
      },
    },
    questions: [
      { id: 'ad_q1', text: 'Ποια είναι η διάρκεια χρήσης του spot και μπορεί να ανανεωθεί; Με ποιο κόστος;' },
      { id: 'ad_q2', text: 'Σε ποιες χώρες/κανάλια θα προβληθεί το spot;' },
      { id: 'ad_q3', text: 'Υπάρχουν cutdowns/edits/versions και προβλέπεται πρόσθετη αμοιβή για κάθε χρήση;' },
      { id: 'ad_q4', text: 'Υπάρχει buyout ή κύκλοι ανανέωσης; Τι ακριβώς καλύπτουν;' },
      { id: 'ad_q5', text: 'Υπάρχει αποκλειστικότητα σε κατηγορία προϊόντος ή ανταγωνιστικές μάρκες;' },
      { id: 'ad_q6', text: 'Υπάρχουν δικαιώματα έγκρισης για το τελικό υλικό ή για νέες χρήσεις;' },
      { id: 'ad_q7', text: 'Αναφέρεται ρητά χρήση AI/digital/voice cloning; Αν ναι, υπό ποιους όρους;' },
    ],
    negotiation: [
      { id: 'ad_n1', title: 'Cutdowns/Edits', why: 'Εξασφαλίζει αμοιβή για κάθε επιπλέον χρήση του υλικού.', proposed: 'Κάθε cutdown/edit/version απαιτεί ξεχωριστή έγκριση και πρόσθετη αμοιβή ανά χρήση.' },
      { id: 'ad_n2', title: 'Buyout & ανανεώσεις', why: 'Ορίζει σαφώς την έκταση και το κόστος της χρήσης.', proposed: 'Το buyout ισχύει για [Χ] μήνες και κάθε ανανέωση τιμολογείται ξεχωριστά.' },
      { id: 'ad_n3', title: 'Αποκλειστικότητα', why: 'Περιορίζει τις δεσμεύσεις μόνο όπου είναι απαραίτητο.', proposed: 'Η αποκλειστικότητα περιορίζεται σε [κατηγορία] και για [Χ] μήνες.' },
      { id: 'ad_n4', title: 'AI / ψηφιακή χρήση', why: 'Αποτρέπει μη εξουσιοδοτημένη ψηφιακή εκμετάλλευση.', proposed: 'Η χρήση AI ή ψηφιακού αντιγράφου απαιτεί ρητή, ξεχωριστή συναίνεση και πρόσθετη αμοιβή.' },
      { id: 'ad_n5', title: 'Media/territory', why: 'Περιορίζει την προβολή στα συμφωνημένα μέσα.', proposed: 'Η χρήση περιορίζεται στα συμφωνημένα κανάλια και χώρες. Κάθε νέα περιοχή απαιτεί νέα συμφωνία.' },
    ],
  },
};
