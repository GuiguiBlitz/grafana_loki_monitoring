$curDate = Get-Date -Format "dddd-MM-dd"
$resultOut =  $PSScriptRoot + "\log\result\check_connections_$curDate.log"
$PSTransciptOut =  $PSScriptRoot+"\log\transcript\check_connections_$curDate.log"
Write-Host "Source Host : " $(hostname) 
#Test TCP
Write-Host "$(Get-Date)+-+-+-+-+-+-+-+-Verrification des acces serveurs via tcp/http+-+-+-+-+-+-+-+-"
Start-Transcript -Path $PSTransciptOut
$inputPath = $PSScriptRoot + "\"+ $(hostname) + ".csv"
Import-Csv  $inputPath | ForEach-Object {
    $tag = $_.Tag
    $targ_hostname = $_.Host
    $port = $_.Port
    $test = $_.Test
    Write-Host "Target $targ_hostname / Port $port / Test $test"
    if ($test -eq "TCP") {
        try {
            $connection = New-Object System.Net.Sockets.TcpClient($targ_hostname , $port ) -ErrorAction Stop
            if ($connection.Connected) {
                " { `"date`": `"$(Get-Date)`", `"status`": `"OK`",`"tag`": `"$tag`", `"source`": `"$(hostname)`", `"target`": `"$targ_hostname`", `"port`": `"$port`", `"test`": `"$test`" }" | Out-File -Encoding "UTF8" -FilePath $resultOut -Append
            }
            else {
                " { `"date`": `"$(Get-Date)`", `"status`": `"KO`",`"tag`": `"$tag`", `"source`": `"$(hostname)`", `"target`": `"$targ_hostname`", `"port`": `"$port`", `"test`": `"$test`" }"  | Out-File -Encoding "UTF8" -FilePath $resultOut -Append
            }
        }
        catch {
            " { `"date`": `"$(Get-Date)`", `"status`": `"KO`",`"tag`": `"$tag`", `"source`": `"$(hostname)`", `"target`": `"$targ_hostname`", `"port`": `"$port`", `"test`": `"$test`" }"  | Out-File -Encoding "UTF8" -FilePath $resultOut -Append
        }
    }
    elseif ($test -like 'HTTP*') {
        try {
            $Response = Invoke-WebRequest -Uri $targ_hostname -UseBasicParsing  -Method Get
            if ($Response.StatusCode -eq "200"){
                " { `"date`": `"$(Get-Date)`", `"status`": `"OK`",`"tag`": `"$tag`", `"source`": `"$(hostname)`", `"target`": `"$targ_hostname`", `"port`": `"$port`", `"test`": `"$test`" }"  | Out-File -Encoding "UTF8" -FilePath $resultOut -Append
            }else{
                " { `"date`": `"$(Get-Date)`", `"status`": `"KO`",`"tag`": `"$tag`", `"source`": `"$(hostname)`", `"target`": `"$targ_hostname`", `"port`": `"$port`", `"test`": `"$test`" }"  | Out-File -Encoding "UTF8" -FilePath $resultOut -Append
            }
        }
        catch {
            " { `"date`": `"$(Get-Date)`", `"status`": `"KO`",`"tag`": `"$tag`", `"source`": `"$(hostname)`", `"target`": `"$targ_hostname`", `"port`": `"$port`", `"test`": `"$test`" }"  | Out-File -Encoding "UTF8" -FilePath $resultOut -Append
        }
    }
}

# #Test de chemins reseaux
# Write-Host "$(Get-Date)+-+-+-+-+-+-+-+-Verrification des acces via chemins reseaux+-+-+-+-+-+-+-+-"
# Import-Csv .\path.csv | ForEach-Object{
#     $testPath = $_.Path
#     $testUser = $_.User
#     $testPwd = $_.Pwd
#     try{
#         New-SmbMapping -LocalPath L: -RemotePath $testPath -username $testUser -Password $testPwd -ErrorAction Stop | Out-Null
#         $status = Get-SmbMapping  -LocalPath L:  | Select-Object -Property Status 
#         if ($status.Status -eq 'OK') {
#             Write-Host "$(Get-Date) | Success | $testPath : $testUser : ***** " 
#             Remove-SmbMapping -LocalPath L: -Force
#         }
#         else{
#             Write-Host "$(Get-Date) | Failed  | $testPath : $testUser : ***** " 
#         }
#     }
#     catch{
#          Write-Host "$(Get-Date) | Failed  |  $testPath : $testUser : ***** "  
#     }
# }
Stop-Transcript