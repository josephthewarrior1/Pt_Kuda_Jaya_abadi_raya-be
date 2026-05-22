# Firestore ERD

ERD ini adalah logical ERD dari struktur Firestore export. Karena Firestore bersifat NoSQL, relasi di bawah dibaca sebagai relasi lewat `documentId` dan field referensi, bukan foreign key database fisik.

## Struktur Collection

```text
users/{userId}
company_profiles/{userId}
counters/{userId}
car_references/{brand}

customer_data/{userId}/customers/{customerId}
car_data/{userId}/cars/{carId}
quotation_records/{userId}/quotations/{quotationId}
invoice_records/{userId}/invoices/{invoiceId}
payment_records/{userId}/payments/{paymentId}
kwitansi_records/{userId}/kwitansis/{kwitansiId}
renewal_records/{userId}/renewals/{renewalId}
```

## ERD Mermaid

```mermaid
erDiagram
    USERS ||--o| COMPANY_PROFILES : owns
    USERS ||--o| COUNTERS : has
    USERS ||--o{ CUSTOMERS : creates
    USERS ||--o{ CARS : creates
    USERS ||--o{ QUOTATIONS : creates
    USERS ||--o{ INVOICES : creates
    USERS ||--o{ PAYMENTS : creates
    USERS ||--o{ KWITANSIS : prints
    USERS ||--o{ RENEWALS : creates

    CUSTOMERS ||--o{ CARS : owns
    CUSTOMERS ||--o{ QUOTATIONS : requests
    CUSTOMERS ||--o{ INVOICES : billed_to
    CUSTOMERS ||--o{ PAYMENTS : pays
    CUSTOMERS ||--o{ RENEWALS : renews

    CARS ||--o{ QUOTATIONS : quoted_for
    CARS ||--o{ INVOICES : invoiced_for
    CARS ||--o{ PAYMENTS : paid_for
    CARS ||--o{ RENEWALS : renewed_for

    QUOTATIONS ||--o| INVOICES : generates
    QUOTATIONS ||--o| PAYMENTS : generates
    RENEWALS ||--o{ QUOTATIONS : has
    RENEWALS ||--o| INVOICES : billed_by
    RENEWALS ||--o| PAYMENTS : paid_by
    PAYMENTS ||--o| KWITANSIS : has_receipt

    CAR_REFERENCES ||--o{ CARS : reference_brand_model

    USERS {
        string userId PK
        string username
        string fullName
        string email
        string firebaseUid
        string status
        timestamp createdAt
        timestamp updatedAt
    }

    COMPANY_PROFILES {
        string userId PK_FK
        string companyName
        string companySubtitle
        string companyCity
        object companyLogo
        timestamp createdAt
        timestamp updatedAt
    }

    COUNTERS {
        string userId PK_FK
        number customerCount
        number carCount
        number invoiceCount
        number paymentCount
        number kwitansiCount
        number renewalCount
    }

    CUSTOMERS {
        string customerId PK
        string userId FK
        string name
        string phone
        string email
        string address
        string status
        string notes
        timestamp createdAt
        timestamp updatedAt
    }

    CARS {
        string carId PK
        string userId FK
        string customerId FK
        object carData
        object carPhotos
        object documentPhotos
        string status
        string notes
        timestamp createdAt
        timestamp updatedAt
    }

    QUOTATIONS {
        string quotationId PK
        string userId FK
        string customerId FK
        string policyId FK
        string policyType
        string renewalId FK
        string quotationNumber
        string insuranceProvider
        string insuranceType
        object coverages
        number tsi
        number totalPremium
        string status
        timestamp createdAt
        timestamp updatedAt
    }

    INVOICES {
        string invoiceId PK
        string userId FK
        string customerId FK
        string carId FK
        string quotationId FK
        string renewalId FK
        string invoiceNumber
        array items
        number subTotal
        number discount
        number grandTotal
        string status
        timestamp issueDate
        timestamp dueDate
        timestamp createdAt
        timestamp updatedAt
    }

    PAYMENTS {
        string paymentId PK
        string userId FK
        string customerId FK
        string policyId FK
        string policyType
        string renewalId FK
        string invoiceNumber FK
        number amount
        string status
        string paymentMethod
        string proofUrl
        timestamp dueDate
        timestamp paidDate
        timestamp createdAt
        timestamp updatedAt
    }

    KWITANSIS {
        string kwitansiId PK
        string userId FK
        string paymentId FK
        string kwitansiNumber
        object invoiceData
        number printCount
        string printedBy
        timestamp issuedDate
        timestamp createdAt
        timestamp updatedAt
    }

    RENEWALS {
        string renewalId PK
        string userId FK
        string customerId FK
        string policyId FK
        string policyType
        string paymentId FK
        date oldStartDate
        date oldEndDate
        date newStartDate
        date newEndDate
        number premium
        string status
        string notes
        timestamp completedAt
        timestamp createdAt
        timestamp updatedAt
    }

    CAR_REFERENCES {
        string brand PK
        object models
    }
```

## Catatan Relasi Penting

- `userId` biasanya sama dengan username dan dipakai sebagai parent document, contoh `car_data/Josep/cars/Josep-CAR-0001`.
- Collection `admins` dan field `users.role` sudah tidak dipakai. Semua akun dianggap user biasa dan akses API cukup divalidasi lewat Firebase Auth token.
- `customers.customerId` direferensikan oleh `cars.customerId`, `quotations.customerId`, `invoices.customerId`, `payments.customerId`, dan `renewals.customerId`.
- `cars.carId` direferensikan sebagai `policyId` saat `policyType = "car"`, dan juga bisa muncul sebagai `invoices.carId`.
- `quotations.quotationId` masuk ke `invoices.quotationId` saat quotation diterima.
- `payments.invoiceNumber` di kode berisi ID dokumen invoice, bukan nomor invoice display.
- `kwitansis.paymentId` mengarah ke `payments.paymentId`.
- Ada legacy subcollection `kwitansi_records/{userId}/kwitansi` selain `kwitansis`; sebaiknya dinormalisasi ke `kwitansis`.
