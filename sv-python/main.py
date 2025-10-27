import pandas as pd
import json
import re  # Para extração de base AT

# Caminho do arquivo
file_path = "alocacao_salas_v3.0_2019 (1).xlsm"

try:
    # --- 1. Ler e Processar a aba "AT" (Esta parte já está correta e robusta) ---
    at_df = pd.read_excel(file_path, sheet_name="AT", header=None, engine='openpyxl', dtype=str)

    start_row, start_col_at = -1, -1
    for r in range(min(10, at_df.shape[0])):
        for c in range(min(10, at_df.shape[1])):
            cell_value = str(at_df.iat[r, c])
            if cell_value.strip().startswith("AT"):
                start_row, start_col_at = r, c
                break
        if start_row != -1: break
    
    if start_row == -1:
        raise ValueError("Não foi possível localizar a coluna 'AT' na planilha 'AT'.")

    col_indices = [start_col_at - 3, start_col_at - 2, start_col_at - 1, start_col_at, start_col_at + 1, start_col_at + 2]
    at_clean = at_df.iloc[start_row:, col_indices]
    at_clean.columns = ["M", "T", "N", "AT", "Sala", "Capacidade"]

    at_clean = at_clean.dropna(subset=["AT", "Sala"]).reset_index(drop=True)
    at_clean["Sala"] = at_clean["Sala"].astype(str)
    at_clean["Capacidade"] = pd.to_numeric(at_clean["Capacidade"], errors='coerce').fillna(0).astype(int)
    at_clean["AT"] = at_clean["AT"].str.strip()
    for col in ['M', 'T', 'N']:
        at_clean[col] = pd.to_numeric(at_clean[col], errors='coerce').fillna(0).astype(int)
    at_clean = at_clean[at_clean['Capacidade'] > 0]

    # --- 2. Ler e Processar a aba "Distancias" (mantém todos os AT_originais únicos, sem merge por base) ---
    dist_df_raw = pd.read_excel(file_path, sheet_name="Distancias", header=None, engine='openpyxl')
    
    # Extrair o cabeçalho (nomes dos departamentos) da linha 1 (índice 0), a partir da coluna B (índice 1)
    header_dist = [str(val).strip() for val in dist_df_raw.iloc[0, 1:].tolist() if str(val).strip()]
    
    # Extrair os dados, começando da linha 2 (índice 1)
    dist_data_raw = dist_df_raw.iloc[1:]
    
    # A coluna com os códigos "AT" é a coluna A (índice 0)
    at_column_original = dist_data_raw.iloc[:, 0]
    
    # A matriz de dados de distância está a partir da coluna B (índice 1)
    distance_values = dist_data_raw.iloc[:, 1:1 + len(header_dist)]

    # Construir um DataFrame limpo e estruturado
    dist_df = pd.DataFrame(distance_values.values, columns=header_dist, index=at_column_original.values)
    dist_df = dist_df.rename_axis("AT_original")
    dist_df.reset_index(inplace=True)

    # Limpar e processar os dados de distância
    dist_df["AT_original"] = dist_df["AT_original"].astype(str)
    dist_df = dist_df[dist_df["AT_original"].str.startswith("AT", na=False)]
    dist_df = dist_df.dropna(subset=['AT_original'])
    
    # NÃO drop_duplicates por base — mantém todos os AT_original únicos (cada variação tem sua linha)
    dist_df = dist_df.drop_duplicates(subset=['AT_original'], keep='first')  # Só remove exatas duplicatas
    
    # Criar coluna normalizada para lookup flexível (remove espaços, normaliza parênteses)
    dist_df['AT_normalized'] = dist_df['AT_original'].str.replace(' ', '').str.strip()
    
    # Usar AT_normalized como índice para lookup
    dist_data = dist_df.set_index('AT_normalized')

    # Converter valores de distância para numérico
    for col in header_dist:
        if col in dist_data.columns:
            dist_data[col] = pd.to_numeric(dist_data[col], errors='coerce').fillna(3000).astype(int)  # Default 3000 se NaN

    # --- 3. Montar a estrutura JSON final ---
    ats_json = []
    for at_code in sorted(at_clean["AT"].unique()):
        salas_list = []
        salas_df = at_clean[at_clean["AT"] == at_code]
        for index, row in salas_df.iterrows():
            salas_list.append({
                "Sala": row["Sala"],
                "Capacidade": int(row["Capacidade"]),
                "disponibilidade": {"M": int(row["M"]), "T": int(row["T"]), "N": int(row["N"])}
            })
        
        # Normalizar at_code para lookup (remove espaços, normaliza)
        at_normalized = at_code.replace(' ', '').strip()
        
        try:
            # Tenta lookup exato por normalizado
            dist_entry = dist_data.loc[at_normalized].dropna().to_dict()
        except KeyError:
            try:
                # Fallback: extrai base AT e tenta lookup por base normalizada
                base_at_match = re.match(r'(AT\d+)', at_code)
                if base_at_match:
                    base_at = base_at_match.group(1)
                    base_normalized = base_at.replace(' ', '').strip()
                    dist_entry = dist_data.loc[base_normalized].dropna().to_dict()
                else:
                    dist_entry = {}
            except KeyError:
                dist_entry = {}
        
        # Remover chaves que não são departamentos válidos
        dist_entry = {k: v for k, v in dist_entry.items() if k != 'AT_original' and str(k).strip() and str(v) != 'nan'}
            
        ats_json.append({
            "codigo": at_code,
            "salas": salas_list,
            "distancias_departamentos": dist_entry
        })

    # --- 4. Salvar o resultado ---
    output_filename = "dados_completos_final.json"
    with open(output_filename, "w", encoding="utf-8") as f:
        json.dump(ats_json, f, ensure_ascii=False, indent=2)

    print(f"✅ JSON gerado com sucesso: {output_filename}")

except FileNotFoundError:
    print(f"❌ Erro: O arquivo '{file_path}' não foi encontrado.")
except Exception as e:
    print(f"Ocorreu um erro inesperado: {e}")