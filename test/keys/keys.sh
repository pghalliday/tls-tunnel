openssl genrsa -out client-key.pem 1024
openssl req -new -key client-key.pem -config cert-request.cnf -out client-csr.pem
openssl x509 -req -in client-csr.pem -signkey client-key.pem -out client-cert.pem
openssl x509 -text -noout -in client-cert.pem
openssl genrsa -out unknown-client-key.pem 1024
openssl req -new -key unknown-key.pem -config cert-request.cnf -out unknown-client-csr.pem
openssl x509 -req -in unknown-csr.pem -signkey unknown-key.pem -out unknown-client-cert.pem
openssl x509 -text -noout -in unknown-client-cert.pem
openssl genrsa -out unknown-server-key.pem 1024
openssl req -new -key unknown-server-key.pem -config cert-request.cnf -out unknown-server-csr.pem
openssl x509 -req -in unknown-server-csr.pem -signkey unknown-server-key.pem -out unknown-server-cert.pem -extensions v3_ca -extfile extensions.cnf
openssl x509 -text -noout -in unknown-server-cert.pem
openssl genrsa -out server-key.pem 1024
openssl req -new -key server-key.pem -config cert-request.cnf -out server-csr.pem
openssl x509 -req -in server-csr.pem -signkey server-key.pem -out server-cert.pem -extensions v3_ca -extfile extensions.cnf
openssl x509 -text -noout -in server-cert.pem
