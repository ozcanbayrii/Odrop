$cert = New-SelfSignedCertificate -DnsName "odrop.local" -CertStoreLocation "Cert:\CurrentUser\My" -Type CodeSigningCert -Subject "CN=ODrop, O=ODrop, C=TR"
Set-AuthenticodeSignature -FilePath "dist\ODrop.exe" -Certificate $cert -TimestampServer "http://timestamp.digicert.com"
Get-AuthenticodeSignature -FilePath "dist\ODrop.exe"
