# Doc des briques des supervision

## installation du ingress controller
    helm upgrade --install ingress-nginx ingress-nginx   --repo https://kubernetes.github.io/ingress-nginx   --namespace ingress-nginx --create-namespace

## creation des volumes persistants 
    kubectl apply -f grafana_volume_claim.yaml

## installation des briques grafana
    helm repo add grafana https://grafana.github.io/helm-charts
    helm repo update
    helm install grafana grafana/grafana --values grafana_values.yaml 
    helm install loki grafana/loki --values loki_values.yaml
    helm install promtail grafana/promtail --values promtail_values.yaml 

### installation plugin infinity
    se connecter en cli sur le pod grafana
    grafana-cli --insecure plugins install yesoreyeram-infinity-datasource
    restart les pods grafana
    kubectl rollout restart deployment grafana

### recup du pwd admin grafana
    kubectl get secret --namespace default grafana -o jsonpath="{.data.admin-password}" | base64 --decode ; echo

## installation de la conf ingress grafana
    cf grafana_ingress.yaml
    kubectl apply -f grafana_ingress.yaml

## conf grafana
    kubectl port-forward svc/grafana 3000:80
    grafana est maintenant dispo sur http://localhost depuis votre pc
    configurer un nouvelle source de donnes loki avec comme conf HTTP/URL : loki.default.svc.cluster.local:3100

## forwarder le port loki pour pouvoir y envoyer des donnees
    kubectl port-forward svc/loki 3100:3100
    checker que c'est OK avec http://localhost:3100/ready
    si ingress est configuré https://localhost/ready

## lancer un promtail sur une machine windows (a la main) :
    promtail-windows-amd64.exe --config.file=promtail-config-win.yaml
    pour tester si le promtail est bien up : http://localhost:9080/ready


## Creation du dashboard Suivi Pentaho EAI vs VTom
    Ajout d'un query sur l'application Suivi Pentaho EAI vs VTom
    Ajout d'un transformation extract fields, source line, format json, replace all fields off
    Ajout d'une transformation orgnize fields, ajout CD_INTERFACE en premier, masquer time,labels,line,tsNs,id

## suppression de logs dans loki
    curl --data "match[]={app=/"Pentaho_EAI/"}" https//localhost/loki/api/admin/delete
    curl -g -X POST  'http://10.1.0.180:3100/loki/api/admin/delete?match[]={app="Pentaho_EAI"}' -H 'x-scope-orgid: 1'

### les docs de conf helm grafana sont dispo ici 
[https://github.com/grafana/helm-charts/tree/main/charts](https://github.com/grafana/helm-charts/tree/main/charts)
 

## requete sur grafana explore
[Documentation LogQL](https://grafana.com/docs/loki/latest/logql/)

    exemples : 
        {app="Blueway",env="REC"} | logfmt |  __error__ = ""
        {app="Blueway",env="DEV"} |= "Svc"