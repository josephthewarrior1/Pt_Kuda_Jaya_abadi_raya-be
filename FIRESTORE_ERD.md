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
kwitansi_records/{userId}/kwitansi/{kwitansiId}
renewal_records/{userId}/renewals/{renewalId}
```

## ERD Mermaid

```mermaid
erDiagram
    users ||--o| company_profiles : "users.userId = company_profiles.userId"
    users ||--o| counters : "users.userId = counters.userId"
    users ||--o{ customer_data : "users.userId = customer_data.userId"
    users ||--o{ car_data : "users.userId = car_data.userId"
    users ||--o{ quotation_records : "users.userId = quotation_records.userId"
    users ||--o{ invoice_records : "users.userId = invoice_records.userId"
    users ||--o{ payment_records : "users.userId = payment_records.userId"
    users ||--o{ kwitansi_records : "users.userId = kwitansi_records.userId"
    users ||--o{ renewal_records : "users.userId = renewal_records.userId"

    customer_data ||--o{ car_data : "customer_data.customerId = car_data.customerId"
    customer_data ||--o{ quotation_records : "customer_data.customerId = quotation_records.customerId"
    customer_data ||--o{ invoice_records : "customer_data.customerId = invoice_records.customerId"
    customer_data ||--o{ payment_records : "customer_data.customerId = payment_records.customerId"
    customer_data ||--o{ renewal_records : "customer_data.customerId = renewal_records.customerId"

    car_data ||--o{ quotation_records : "car_data.carId = quotation_records.policyId"
    car_data ||--o{ invoice_records : "car_data.carId = invoice_records.carId"
    car_data ||--o{ payment_records : "car_data.carId = payment_records.policyId"
    car_data ||--o{ renewal_records : "car_data.carId = renewal_records.policyId"

    quotation_records ||--o| invoice_records : "quotation_records.quotationId = invoice_records.quotationId"
    invoice_records ||--o{ payment_records : "invoice_records.invoiceId = payment_records.invoiceNumber"
    payment_records ||--o| kwitansi_records : "payment_records.paymentId = kwitansi_records.paymentId"
    renewal_records ||--o{ quotation_records : "renewal_records.renewalId = quotation_records.renewalId"
    renewal_records ||--o| invoice_records : "renewal_records.renewalId = invoice_records.renewalId"
    renewal_records ||--o| payment_records : "renewal_records.renewalId = payment_records.renewalId"

    car_references ||--o{ car_data : "car_references.brand = car_data.carData.carBrand"

    users {
        string userId PK
        string username
        string fullName
        string email
        string firebaseUid
        string status
        timestamp createdAt
        timestamp updatedAt
    }

    company_profiles {
        string userId PK_FK
        string companyName
        string companySubtitle
        string companyCity
        object companyLogo
        timestamp createdAt
        timestamp updatedAt
    }

    counters {
        string userId PK_FK
        number customerCount
        number carCount
        number invoiceCount
        number paymentCount
        number kwitansiCount
        number renewalCount
    }

    customer_data {
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

    car_data {
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

    quotation_records {
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

    invoice_records {
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

    payment_records {
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

    kwitansi_records {
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

    renewal_records {
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

    car_references {
        string brand PK
        object models
    }
```

## Catatan Relasi Penting

- `userId` biasanya sama dengan username dan dipakai sebagai parent document, contoh `invoice_records/Josep/invoices/inv-1`.
- Collection `admins` dan field `users.role` sudah tidak dipakai. Semua akun dianggap user biasa dan akses API cukup divalidasi lewat Firebase Auth token.
- `customers.customerId` direferensikan oleh `cars.customerId`, `quotations.customerId`, `invoices.customerId`, `payments.customerId`, dan `renewals.customerId`.
- `cars.carId` direferensikan sebagai `policyId` saat `policyType = "car"`, dan juga bisa muncul sebagai `invoices.carId`.
- `quotations.quotationId` masuk ke `invoices.quotationId` saat quotation diterima.
- `payments.invoiceNumber` di kode berisi ID dokumen invoice, bukan nomor invoice display.
- `kwitansi.paymentId` mengarah ke `payments.paymentId`.
- Subcollection kwitansi yang aktif adalah `kwitansi_records/{userId}/kwitansi`. Backend masih dapat membaca legacy subcollection `kwitansis` untuk data lama.

## Detail Collection

Walaupun sistem menggunakan Firestore yang bersifat NoSQL, setiap collection tetap dapat dijelaskan seperti tabel logical. Primary key pada detail di bawah mengacu pada document ID Firestore, sedangkan relationship dibaca dari field referensi seperti `userId`, `createdBy`, `customerId`, `carId`, `policyId`, `quotationId`, `paymentId`, dan `renewalId`.

| Table Name | Components | Relationship of the Table |
| --- | --- | --- |
| users | 1. `id` as primary key, using the username or Firebase UID as the Firestore document ID.<br>2. `username` as the account username used for login and document grouping.<br>3. `fullName` as the full name of the user.<br>4. `email` as the email address of the user.<br>5. `password` as the hashed password for legacy/local authentication data.<br>6. `firebaseUid` as the user identifier from Firebase Authentication.<br>7. `firebaseEmail` as the email stored from Firebase Authentication, if available.<br>8. `role` as the legacy role field, usually stored as user/admin but no longer used for active authorization.<br>9. `status` as the activity status of the user, for example Active.<br>10. `createdAt` as the timestamp when the user was created.<br>11. `updatedAt` as the timestamp when the user data was last updated. | 1. One user can only have one company profile.<br>2. One user can only have one counter document.<br>3. One user can have many customers.<br>4. One user can have many car or policy records.<br>5. One user can create many quotations.<br>6. One user can create many invoices.<br>7. One user can create many payment records.<br>8. One user can print many kwitansi records.<br>9. One user can create many renewal records. |
| company_profiles | 1. `userId` as primary key and reference to the user document ID.<br>2. `companyName` as the company name displayed on business documents.<br>3. `companySubtitle` as the company subtitle or supporting description.<br>4. `companyCity` as the company city location.<br>5. `companyLogo` as an object containing logo URL, Cloudinary public ID, upload time, width, height, and format.<br>6. `createdAt` as the timestamp when the company profile was created.<br>7. `updatedAt` as the timestamp when the company profile was last updated. | 1. One company profile can only belong to one user.<br>2. One user can only maintain one company profile. |
| counters | 1. `userId` as primary key and reference to the user document ID.<br>2. `customerCount` as the latest sequence number used for customer IDs.<br>3. `carCount` as the latest sequence number used for car IDs.<br>4. `invoiceCount` as the latest sequence number used for invoice IDs.<br>5. `paymentCount` as the latest sequence number used for payment IDs.<br>6. `kwitansiCount` as the latest sequence number used for kwitansi IDs.<br>7. `renewalCount` as the latest sequence number used for renewal IDs. | 1. One counter document can only belong to one user.<br>2. One counter document is used to generate sequential IDs for the user's customer, car, invoice, payment, kwitansi, and renewal records. |
| customer_data | 1. `id` as primary key, generated using the user ID and customer sequence number.<br>2. `name` as the customer name.<br>3. `email` as the customer email address.<br>4. `phone` as the customer phone number.<br>5. `address` as the customer address.<br>6. `notes` as additional notes about the customer.<br>7. `status` as the customer status.<br>8. `createdBy` as the user who created the customer record.<br>9. `createdAt` as the timestamp when the customer was created.<br>10. `updatedAt` as the timestamp when the customer was last updated. | 1. One customer can only be created by one user.<br>2. One customer can have many car or policy records.<br>3. One customer can have many quotations.<br>4. One customer can have many invoices.<br>5. One customer can have many payment records.<br>6. One customer can have many renewal records. |
| car_data | 1. `id` as primary key, generated using the user ID and car sequence number.<br>2. `customerId` as the customer who owns the car or policy.<br>3. `carData.ownerName` as the vehicle owner name.<br>4. `carData.carBrand` as the car brand.<br>5. `carData.carModel` as the car model.<br>6. `carData.plateNumber` as the vehicle plate number.<br>7. `carData.chassisNumber` as the vehicle chassis number.<br>8. `carData.engineNumber` as the vehicle engine number.<br>9. `carData.startDate` as the insurance or policy start date.<br>10. `carData.dueDate` as the insurance or policy due date.<br>11. `carData.carPrice` as the insured vehicle price or TSI source value.<br>12. `carData.color` as the vehicle color.<br>13. `carData.year` as the vehicle production year.<br>14. `carData.insuranceProvider` as the selected insurance provider.<br>15. `carData.insuranceType` as the selected insurance type.<br>16. `carData.coverageExtensions` as additional coverage options.<br>17. `carPhotos` as an object containing vehicle photo URLs such as left side, right side, front, back, and dashboard.<br>18. `documentPhotos` as an object containing document photo URLs such as STNK, SIM, KTP, and policy document.<br>19. `status` as the car or policy status.<br>20. `notes` as additional notes about the car.<br>21. `createdBy` as the user who created the car record.<br>22. `createdAt` as the timestamp when the car was created.<br>23. `updatedAt` as the timestamp when the car was last updated. | 1. One car can only belong to one customer.<br>2. One car can only be created by one user.<br>3. One car can have many quotation records through `policyId`.<br>4. One car can have many invoice records through `carId`.<br>5. One car can have many payment records through `policyId`.<br>6. One car can have many renewal records through `policyId`. |
| quotation_records | 1. `id` as primary key, generated by Firestore or stored as quotation document ID.<br>2. `customerId` as the customer related to the quotation.<br>3. `policyType` as the type of policy, for example car.<br>4. `policyId` as the related policy or car ID.<br>5. `renewalId` as the renewal record ID if the quotation is created from a renewal process.<br>6. `quotationNumber` as the displayed quotation number.<br>7. `tsi` as the total sum insured value.<br>8. `insuranceProvider` as the provider used in the quotation.<br>9. `insuranceType` as the type of insurance package.<br>10. `coverages` as an object containing coverage configuration, percentage, fixed amount flag, and free include flag.<br>11. `totalPremium` as the calculated total premium.<br>12. `userId` as the user related to the quotation.<br>13. `status` as the quotation status, such as Pending or Accepted.<br>14. `createdAt` as the timestamp when the quotation was created.<br>15. `updatedAt` as the timestamp when the quotation was last updated. | 1. One quotation can only be created by one user.<br>2. One quotation can only belong to one customer.<br>3. One quotation can only refer to one policy or car.<br>4. One quotation may belong to one renewal process.<br>5. One accepted quotation can generate one invoice.<br>6. One accepted quotation can generate one payment record. |
| invoice_records | 1. `id` as primary key, generated from the invoice sequence number, for example `inv-1`.<br>2. `invoiceNumber` as the displayed invoice number.<br>3. `customerId` as the customer billed by the invoice.<br>4. `customerName` as the customer name snapshot for the invoice.<br>5. `carId` as the related car or policy ID.<br>6. `plateNumber` as the vehicle plate number snapshot.<br>7. `quotationId` as the quotation that generated the invoice.<br>8. `renewalId` as the renewal record related to the invoice, if available.<br>9. `items` as the list of invoice line items.<br>10. `subTotal` as the subtotal amount before discount.<br>11. `discount` as the discount amount.<br>12. `grandTotal` as the final invoice total.<br>13. `issueDate` as the date when the invoice was issued.<br>14. `dueDate` as the payment due date of the invoice.<br>15. `status` as the invoice status, for example Unpaid or Paid.<br>16. `notes` as additional invoice notes.<br>17. `createdBy` as the user who created the invoice.<br>18. `createdAt` as the timestamp when the invoice was created.<br>19. `updatedAt` as the timestamp when the invoice was last updated. | 1. One invoice can only be created by one user.<br>2. One invoice can only belong to one customer.<br>3. One invoice can refer to one car or policy.<br>4. One invoice can be generated from one quotation.<br>5. One invoice may be connected to one renewal process.<br>6. One invoice can be paid through one or more payment records depending on business flow. |
| payment_records | 1. `id` as primary key, generated from the payment sequence number, for example `pay-1`.<br>2. `customerId` as the customer who makes the payment.<br>3. `policyType` as the related policy type, for example car.<br>4. `policyId` as the related policy or car ID.<br>5. `renewalId` as the renewal record related to the payment, if available.<br>6. `invoiceNumber` as the invoice document reference used by the backend.<br>7. `amount` as the payment amount.<br>8. `dueDate` as the due date of the payment.<br>9. `paidDate` as the date when payment was completed.<br>10. `paymentMethod` as the payment method used by the customer.<br>11. `status` as the payment status, for example Pending or Paid.<br>12. `proofUrl` as the uploaded proof of payment URL.<br>13. `notes` as additional payment notes.<br>14. `createdBy` as the user who created the payment record.<br>15. `createdAt` as the timestamp when the payment was created.<br>16. `updatedAt` as the timestamp when the payment was last updated. | 1. One payment can only be created by one user.<br>2. One payment can only belong to one customer.<br>3. One payment can refer to one car or policy.<br>4. One payment can refer to one invoice.<br>5. One payment may be connected to one renewal process.<br>6. One payment can have one kwitansi record as receipt. |
| kwitansi_records | 1. `id` as primary key, generated from the kwitansi sequence number, for example `kwt-1`.<br>2. `kwitansiNumber` as the displayed receipt number.<br>3. `paymentId` as the payment record connected to the receipt.<br>4. `invoiceData` as a snapshot object of invoice information used when the kwitansi is printed.<br>5. `issuedDate` as the date when the kwitansi was issued.<br>6. `printedBy` as the user who printed the kwitansi.<br>7. `printCount` as the number of times the kwitansi has been printed.<br>8. `createdAt` as the timestamp when the kwitansi was created.<br>9. `updatedAt` as the timestamp when the kwitansi was last updated. | 1. One kwitansi can only be printed by one user.<br>2. One kwitansi can only belong to one payment record.<br>3. One payment can have one kwitansi as proof of receipt. |
| renewal_records | 1. `id` as primary key, generated from the renewal sequence number, for example `ren-1`.<br>2. `customerId` as the customer who renews the policy.<br>3. `policyType` as the type of policy being renewed, for example car.<br>4. `policyId` as the policy or car ID being renewed.<br>5. `paymentId` as the payment record connected to the renewal, if available.<br>6. `oldStartDate` as the previous policy start date.<br>7. `oldEndDate` as the previous policy end date.<br>8. `newStartDate` as the new policy start date.<br>9. `newEndDate` as the new policy end date.<br>10. `premium` as the renewal premium amount.<br>11. `status` as the renewal status, such as Pending, Approved, Completed, or Cancelled.<br>12. `notes` as additional renewal notes.<br>13. `completedAt` as the timestamp when the renewal was completed.<br>14. `createdBy` as the user who created the renewal record.<br>15. `createdAt` as the timestamp when the renewal was created.<br>16. `updatedAt` as the timestamp when the renewal was last updated. | 1. One renewal can only be created by one user.<br>2. One renewal can only belong to one customer.<br>3. One renewal can only renew one policy or car.<br>4. One renewal can generate many quotation options.<br>5. One completed renewal may be connected to one invoice.<br>6. One completed renewal may be connected to one payment record. |
| car_references | 1. `brand` as primary key and Firestore document ID.<br>2. `_brandExists` as a flag to ensure the brand document exists.<br>3. Dynamic model fields as available car models under the brand, stored with boolean values.<br>4. `models` as a logical representation of available model names when displayed by the application. | 1. One car reference brand can contain many car models.<br>2. One car record can use one brand and one model from car references.<br>3. Car references are used as master data to standardize car brand and model input. |
