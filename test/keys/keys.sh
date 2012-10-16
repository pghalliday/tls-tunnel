openssl genrsa -out client-key.pem 1024
openssl req -new -key client-key.pem -out client-csr.pem << EOF
US
Washington
Seattle
MyCompany
MyUnit
John Smith
jsmith@email.com
hello
MyCompany
EOF
openssl x509 -req -in client-csr.pem -signkey client-key.pem -out client-cert.pem
openssl genrsa -out unknown-key.pem 1024
openssl req -new -key unknown-key.pem -out unknown-csr.pem << EOF
US
Washington
Seattle
MyCompany
MyUnit
John Smith
jsmith@email.com
hello
MyCompany
EOF
openssl x509 -req -in unknown-csr.pem -signkey unknown-key.pem -out unknown-cert.pem
openssl genrsa -out server-key.pem 1024
openssl req -new -key server-key.pem -out server-csr.pem << EOF
US
Washington
Seattle
MyCompany
MyUnit
John Smith
jsmith@email.com
hello
MyCompany
EOF
openssl x509 -req -in server-csr.pem -signkey server-key.pem -out server-cert.pem -extfile openssl.cnf -extensions v3_req
openssl x509 -text -noout -in server-cert.pem
#openssl req -new -key server-key.pem -out server-csr.pem
#openssl x509 -req -in server-csr.pem -signkey server-key.pem -out server-cert.pem