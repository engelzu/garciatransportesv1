import fetch from 'node-fetch';

// Chave da API Geoapify fornecida por você 
const GEOAPIFY_API_KEY = '3bd73ecada1d478a8c9473ad4115be38';

export default async function handler(req, res) {
  const { origins, destinations } = req.query;

  if (!origins || !destinations) {
    return res.status(400).json({ error: 'Origem e destino são obrigatórios' });
  }

  // A API do Geoapify espera coordenadas.
  // Vamos assumir que o frontend (que modificaremos a seguir)
  // enviará as coordenadas como strings "latitude,longitude".
  const [origLat, origLon] = origins.split(',').map(Number);
  const [destLat, destLon] = destinations.split(',').map(Number);

  if (isNaN(origLat) || isNaN(origLon) || isNaN(destLat) || isNaN(destLon)) {
      return res.status(400).json({ error: 'Formato de coordenadas inválido. Esperado: "lat,lon"' });
  }

  const url = `https://api.geoapify.com/v1/matrix?mode=drive&apiKey=${GEOAPIFY_API_KEY}`;
  
  const options = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      "mode": "drive", // Modo de condução
      "origins": [{ "latitude": origLat, "longitude": origLon }],
      "destinations": [{ "latitude": destLat, "longitude": destLon }]
    })
  };

  try {
    const response = await fetch(url, options);
    const data = await response.json();

    // Mapeia a resposta do Geoapify para o formato exato do Google
    // para que não precisemos mudar o código no frontend (admin.html).
    if (data.sources_to_targets && data.sources_to_targets[0]) {
      const element = data.sources_to_targets[0][0];

      // element.distance está em metros
      // element.time está em segundos
      
      const googleLikeResponse = {
        status: 'OK',
        rows: [{
          elements: [{
            status: 'OK',
            distance: { value: element.distance }, // Distância em metros
            duration: { value: element.time }      // Duração em segundos
          }]
        }]
      };
      
      res.status(200).json(googleLikeResponse);
      
    } else {
      // Se o Geoapify der um erro
      console.error('Erro na resposta do Geoapify:', data);
      res.status(500).json({ status: 'ERROR', error_message: data.message || 'Erro ao calcular rota' });
    }
  } catch (error) {
    console.error('Erro ao chamar a API do Geoapify:', error);
    res.status(500).json({ error: 'Erro ao buscar a distância da API do Geoapify' });
  }
}